import { supabase } from './supabaseClient'
import { TABLES } from './constants'
import { InventoryItemDto } from './dto/inventoryItemDto'

function mapPOFromDb(po) {
  if (!po) return po
  return {
    ...po,
    purchase_order_items: (po.purchase_order_items || []).map(li => ({
      ...li,
      inventory_items: InventoryItemDto.fromDao(li.inventory_items),
    })),
  }
}

const PO_SELECT = `
  *,
  purchase_order_items (
    id,
    inventory_id,
    quantity,
    price,
    inventory_items ( id, name, category, brand )
  )
`

export class PurchaseOrderService {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .select(PO_SELECT)
      .order('created_at', { ascending: false })

    return { data: (data || []).map(mapPOFromDb), error }
  }

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .select(PO_SELECT)
      .eq('id', id)
      .single()

    return { data: mapPOFromDb(data), error }
  }

  async create(order) {
    // 1. Insert PO header
    const { data: header, error: headerError } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .insert({
        supplier_id: order.supplier_id,
        notes: order.notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (headerError || !header) return { data: null, error: headerError }

    // 2. Insert line items
    const lineItems = order.items.map(item => ({
      purchase_order_id: header.id,
      inventory_id: item.inventory_id,
      quantity: item.quantity,
      price: item.price || 0,
    }))

    const { error: itemsError } = await supabase
      .from(TABLES.PURCHASE_ORDER_ITEMS)
      .insert(lineItems)

    if (itemsError) return { data: null, error: itemsError }

    // 3. Re-fetch with joins
    return this.getById(header.id)
  }

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PO_SELECT)
      .single()

    return { data: mapPOFromDb(data), error }
  }

  /**
   * Mark PO as registered: update status + add stock qty to inventory_items +
   * create inventory_unit rows for each unit.
   */
  async receive(id) {
    // 1. Get PO with line items
    const { data: po, error: fetchError } = await this.getById(id)
    if (fetchError || !po) return { data: null, error: fetchError }

    // 2. Update status
    const { error: statusError } = await supabase
      .from(TABLES.PURCHASE_ORDERS)
      .update({ status: 'registered', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (statusError) return { data: null, error: statusError }

    // 3. For each line item: increase inventory qty + create unit rows
    for (const li of po.purchase_order_items) {
      const itemId = li.inventory_id

      // Get current item qty
      const { data: item } = await supabase
        .from(TABLES.INVENTORY_ITEMS)
        .select('quantity')
        .eq('id', itemId)
        .single()

      if (item) {
        await supabase
          .from(TABLES.INVENTORY_ITEMS)
          .update({ quantity: (item.quantity || 0) + li.quantity })
          .eq('id', itemId)
      }
    }

    // 4. Re-fetch
    return this.getById(id)
  }
}

export const purchaseOrderService = new PurchaseOrderService()
export { PurchaseOrderService }
