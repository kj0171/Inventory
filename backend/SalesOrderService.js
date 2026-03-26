import { supabase } from './supabaseClient'

export class SalesOrderService {
  async getAll() {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        inventory_items ( name, item_category, item_group )
      `)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  }

  async create(order) {
    const { data, error } = await supabase
      .from('sales_orders')
      .insert({
        inventory_stock_id: order.inventory_stock_id,
        item_id: order.item_id,
        quantity: order.quantity,
        customer_name: order.customer_name,
        customer_contact: order.customer_contact || null,
        notes: order.notes || null,
        status: 'pending',
      })
      .select(`
        *,
        inventory_items ( name, item_category, item_group )
      `)
      .single()

    return { data, error }
  }

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(`
        *,
        inventory_items ( name, item_category, item_group )
      `)
      .single()

    return { data, error }
  }
}

export const salesOrderService = new SalesOrderService()
