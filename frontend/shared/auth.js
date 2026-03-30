'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../../backend'
import { supabase } from '../../backend/supabaseClient'

const AuthContext = createContext(null)

export const ROLES = {
  ADMIN: 'admin',
  SALESPERSON: 'salesperson',
  DISPATCHER: 'dispatcher',
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On mount, check if there's an existing session
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const profile = await authService.fetchProfile(session.user.id)
        setUser({ ...session.user, access_token: session.access_token, profile })
      }
      setLoading(false)
    }
    init()

    // Listen for sign-out and token refresh only
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'TOKEN_REFRESHED' && session) {
        setUser(prev => prev ? { ...prev, access_token: session.access_token } : prev)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function canAccessWithRole(role, tab) {
  return true
}

// Keep backward-compat for Sidebar/TabNavigation that calls canAccess without args
export function canAccess(tab) {
  // This will be overridden by components that use useAuth
  return true
}
