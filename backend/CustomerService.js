import { supabase } from './supabaseClient'

class CustomerService {
  async getAll() {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  }

  async create({ name, mobile, email, gst_number }) {
    const { data, error } = await supabase
      .from('customers')
      .insert({ name, mobile, email: email || null, gst_number: gst_number || null })
      .select()
      .single()
    return { data, error }
  }

  async update(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  }

  async remove(id) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    return { error }
  }
}

export const customerService = new CustomerService()
export { CustomerService }
