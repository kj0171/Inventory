// Dummy user context — will be replaced with Supabase Auth later
export const CURRENT_USER = {
  id: 'user-001',
  full_name: 'Admin User',
  role: 'admin', // 'admin' | 'salesperson' | 'dispatcher'
}

export const ROLES = {
  ADMIN: 'admin',
  SALESPERSON: 'salesperson',
  DISPATCHER: 'dispatcher',
}

export function canAccess(tab) {
  const role = CURRENT_USER.role
  if (role === ROLES.ADMIN) return true
  if (tab === 'inventory') return role === ROLES.SALESPERSON
  if (tab === 'sales') return role === ROLES.SALESPERSON
  if (tab === 'dispatch') return role === ROLES.DISPATCHER
  return false
}
