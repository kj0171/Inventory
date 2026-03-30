import { supabase } from './supabaseClient'

const ORDER_SELECT = `
  *,
  sales_order_items (
    id,
    inventory_stock_id,
    item_id,
    quantity,
    inventory_items ( name, item_category, item_group )
  )
`

export class SalesOrderService {
  async getAll() {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  }

  async create(order) {
    // 1. Insert order header
    const { data: header, error: headerError } = await supabase
      .from('sales_orders')
      .insert({
        customer_name: order.customer_name,
        customer_contact: order.customer_contact || null,
        notes: order.notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (headerError || !header) return { data: null, error: headerError }

    // 2. Insert line items
    const lineItems = order.items.map(item => ({
      sales_order_id: header.id,
      inventory_stock_id: item.inventory_stock_id,
      item_id: item.item_id,
      quantity: item.quantity,
    }))

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(lineItems)

    if (itemsError) return { data: null, error: itemsError }

    // 3. Re-fetch with joins
    const { data, error } = await supabase
      .from('sales_orders')
      .select(ORDER_SELECT)
      .eq('id', header.id)
      .single()

    return { data, error }
  }

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(ORDER_SELECT)
      .single()

    return { data, error }
  }
}

export const salesOrderService = new SalesOrderService()
