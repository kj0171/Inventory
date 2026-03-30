'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../../backend'

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
    let mounted = true

    authService.getSession().then(({ user }) => {
      if (mounted) {
        setUser(user)
        setLoading(false)
      }
    }).catch(() => {
      if (mounted) setLoading(false)
    })

    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        const { user } = await authService.getSession()
        if (mounted) setUser(user)
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setUser(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
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
