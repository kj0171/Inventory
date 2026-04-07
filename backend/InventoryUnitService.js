import { supabase } from './supabaseClient'
import { TABLES } from './constants'

export class InventoryUnitService {
  async getByPOId(poId) {
    const { data, error } = await supabase
      .from(TABLES.INVENTORY_UNITS)
      .select('*')
      .eq('po_id', poId)
      .order('created_at', { ascending: true })

    return { data: data || [], error }
  }

  async getCountsByPOIds(poIds) {
    const { data, error } = await supabase
      .from(TABLES.INVENTORY_UNITS)
      .select('po_id')
      .in('po_id', poIds)

    if (error) return { data: {}, error }
    // Group counts by po_id
    const counts = {}
    for (const row of (data || [])) {
      counts[row.po_id] = (counts[row.po_id] || 0) + 1
    }
    return { data: counts, error: null }
  }

  async getByInventoryId(inventoryId) {
    const { data, error } = await supabase
      .from(TABLES.INVENTORY_UNITS)
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('created_at', { ascending: true })

    return { data: data || [], error }
  }

  async create(units) {
    const rows = units.map(u => ({
      inventory_id: u.inventory_id,
      po_id: u.po_id || null,
      so_id: u.so_id || null,
      identifier: u.identifier,
      status: u.status || 'available',
    }))

    const { data, error } = await supabase
      .from(TABLES.INVENTORY_UNITS)
      .insert(rows)
      .select()

    return { data: data || [], error }
  }

  async update(id, fields) {
    const { data, error } = await supabase
      .from(TABLES.INVENTORY_UNITS)
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  }

  async delete(id) {
    const { error } = await supabase
      .from(TABLES.INVENTORY_UNITS)
      .delete()
      .eq('id', id)

    return { error }
  }
}

export const inventoryUnitService = new InventoryUnitService()
