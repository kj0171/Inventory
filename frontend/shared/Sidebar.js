'use client'

import { useAuth, canAccessWithRole } from './auth'

const NAV_ITEMS = [
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'orders', label: 'Orders', icon: '📋' },
  { id: 'team', label: 'Team', icon: '👥' },
]

export default function Sidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, mobileOpen, onMobileClose, onSignOut }) {
  const { user } = useAuth()
  const role = user?.profile?.role || ''
  const visibleItems = NAV_ITEMS.filter(item => canAccessWithRole(role, item.id))

  function handleNavClick(id) {
    onSectionChange(id)
    if (mobileOpen && onMobileClose) onMobileClose()
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={onMobileClose} />}

      <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="sidebar-brand">
          {!collapsed && <span className="sidebar-brand-text">Firm Name</span>}
          <button className="sidebar-toggle" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '☰' : '✕'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleItems.map(item => (
            <button
              key={item.id}
              className={`sidebar-item ${activeSection === item.id ? 'sidebar-item-active' : ''}`}
              onClick={() => handleNavClick(item.id)}
              title={item.label}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {!collapsed && user && (
            <div className="sidebar-user">
              <span className="sidebar-user-name">{user.profile?.full_name || user.email}</span>
              <span className="sidebar-user-role">{user.profile?.role}</span>
            </div>
          )}
          <button className="sidebar-signout" onClick={onSignOut} title="Sign Out">
            <span className="sidebar-icon">🚪</span>
            {!collapsed && <span className="sidebar-label">Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  )
}
