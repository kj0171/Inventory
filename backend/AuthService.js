import { supabase } from './supabaseClient'

export class AuthService {
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { user: null, error }

      // Fetch profile — never block sign-in
      let profile = null
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle()
      if (!profileError) profile = profileData
      else console.warn('Profile fetch error:', profileError.message)

      return { user: { ...data.user, access_token: data.session?.access_token, profile }, error: null }
    } catch (e) {
      return { user: null, error: { message: e.message || 'Sign in failed' } }
    }
  }

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) return { user: null, error }

      // Fetch profile — never block session restore
      let profile = null
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profileError) profile = profileData
      else console.warn('Profile fetch error:', profileError.message)

      return { user: { ...session.user, access_token: session.access_token, profile }, error: null }
    } catch (e) {
      return { user: null, error: { message: e.message } }
    }
  }

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const authService = new AuthService()
