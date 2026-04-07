import { supabase } from './supabaseClient'
import { TABLES } from './constants'

class SupplierService {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.SUPPLIERS)
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  }

  async create({ name, firm_name, mobile, email, gst_number, address }) {
    const { data, error } = await supabase
      .from(TABLES.SUPPLIERS)
      .insert({
        name,
        firm_name: firm_name || null,
        mobile,
        email: email || null,
        gst_number: gst_number || null,
        address: address || null,
      })
      .select()
      .single()
    return { data, error }
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.SUPPLIERS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  }

  async remove(id) {
    const { error } = await supabase
      .from(TABLES.SUPPLIERS)
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const supplierService = new SupplierService()
export { SupplierService }
