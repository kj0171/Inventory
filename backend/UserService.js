import { supabase } from './supabaseClient'

export class UserService {
  async getAll() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  }

  async createUser({ email, password, full_name, phone, role }, currentUser) {
    // Use token from auth context if available, fall back to getSession
    let accessToken = currentUser?.access_token
    if (!accessToken) {
      const { data: { session } } = await supabase.auth.getSession()
      accessToken = session?.access_token
    }
    if (!accessToken) return { data: null, error: { message: 'Not authenticated' } }

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, password, full_name, phone, role }),
    })

    const result = await res.json()
    if (!res.ok) {
      console.error('Create user failed:', result)
      return { data: null, error: { message: result.error, debug: result.debug } }
    }
    return { data: result.user, error: null }
  }

  async updateUser(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()

    if (error) return { data: null, error }
    return { data: data?.[0] || null, error: null }
  }

  async deleteUser(userId) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return { error: { message: 'Not authenticated' } }

    const res = await fetch(`/api/users?id=${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    })

    const result = await res.json()
    if (!res.ok) return { error: { message: result.error } }
    return { error: null }
  }
}

export const userService = new UserService()
