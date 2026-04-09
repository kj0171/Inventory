import { supabase } from './supabaseClient'
import { TABLES } from './constants'
import { InventoryItemDto } from './dto/inventoryItemDto'

function mapOrderFromDb(order) {
  if (!order) return order
  return {
    ...order,
    sales_order_items: (order.sales_order_items || []).map(li => {
      return { ...li, inventory_items: InventoryItemDto.fromDao(li.inventory_items) }
    })
  }
}

const ORDER_SELECT = `
  *,
  sales_order_items (
    id,
    item_id,
    quantity,
    price,
    inventory_items ( name, category, brand )
  )
`

export class SalesOrderService {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.SALES_ORDERS)
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })

    if (error) console.error('[SalesOrderService.getAll]', error.message)

    return { data: (data || []).map(mapOrderFromDb), error }
  }

  async create(order) {
    // 1. Insert order header
    const { data: header, error: headerError } = await supabase
      .from(TABLES.SALES_ORDERS)
      .insert({
        customer_id: order.customer_id,
        notes: order.notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (headerError || !header) return { data: null, error: headerError }

    // 2. Insert line items
    const lineItems = order.items.map(item => ({
      sales_order_id: header.id,
      item_id: item.item_id,
      quantity: item.quantity,
      price: item.price || 0,
    }))

    const { error: itemsError } = await supabase
      .from(TABLES.SALES_ORDER_ITEMS)
      .insert(lineItems)

    if (itemsError) return { data: null, error: itemsError }

    // 3. Re-fetch with joins
    const { data, error } = await supabase
      .from(TABLES.SALES_ORDERS)
      .select(ORDER_SELECT)
      .eq('id', header.id)
      .single()

    return { data: mapOrderFromDb(data), error }
  }

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from(TABLES.SALES_ORDERS)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(ORDER_SELECT)
      .single()

    return { data: mapOrderFromDb(data), error }
  }
}

export const salesOrderService = new SalesOrderService()
