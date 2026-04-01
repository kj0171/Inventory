import { supabase } from './supabaseClient'
import { TABLES } from './constants'

class CustomerService {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  }

  async create({ name, mobile, email, gst_number }) {
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .insert({ name, mobile, email: email || null, gst_number: gst_number || null })
      .select()
      .single()
    return { data, error }
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from(TABLES.CUSTOMERS)
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  }

  async remove(id) {
    const { error } = await supabase
      .from(TABLES.CUSTOMERS)
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const customerService = new CustomerService()
export { CustomerService }
