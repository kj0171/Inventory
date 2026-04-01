'use client'

import { Box, Drawer, Indicator, NavLink, Stack, Text, UnstyledButton } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useAuth, canAccessWithRole } from './auth'

const NAV_ITEMS = [
  { id: 'inventory', label: 'Inventory', icon: '📦' },
  { id: 'orders', label: 'Orders', icon: '📋' },
  { id: 'customers', label: 'Customers', icon: '🧑‍💼' },
  { id: 'team', label: 'Team', icon: '👥' },
]

const sidebarBg = 'linear-gradient(180deg, #1e1e2f 0%, #2d2d44 100%)'
const activeGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

function SidebarContent({ activeSection, onSectionChange, collapsed, onToggleCollapse, onSignOut, cartCount, onCartToggle, onClose }) {
  const { user } = useAuth()
  const role = user?.profile?.role || ''
  const visibleItems = NAV_ITEMS.filter(item => canAccessWithRole(role, item.id))

  function handleNavClick(id) {
    onSectionChange(id)
    if (onClose) onClose()
  }

  return (
    <Box
      h="100%"
      style={{
        background: sidebarBg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Brand */}
      <Box
        px="md"
        py="lg"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          minHeight: 60,
        }}
      >
        {!collapsed && (
          <Text c="white" fw={600} size="md" style={{ letterSpacing: 0.5, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            {process.env.NEXT_PUBLIC_FIRM_NAME || 'Firm Name'}
          </Text>
        )}
        {onToggleCollapse && (
          <UnstyledButton
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand' : 'Collapse'}
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '1.2rem',
              padding: '4px 8px',
              borderRadius: 6,
              flexShrink: 0,
            }}
          >
            {collapsed ? '☰' : '✕'}
          </UnstyledButton>
        )}
      </Box>

      {/* Nav items */}
      <Stack gap={4} px={8} py={12} style={{ flex: 1 }}>
        {visibleItems.map(item => (
          <UnstyledButton
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            title={item.label}
            px={collapsed ? 8 : 14}
            py={12}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10,
              color: activeSection === item.id ? 'white' : 'rgba(255,255,255,0.65)',
              background: activeSection === item.id ? activeGradient : 'transparent',
              boxShadow: activeSection === item.id ? '0 4px 12px rgba(102,126,234,0.3)' : 'none',
              fontWeight: 500,
              fontSize: '0.95rem',
              width: '100%',
            }}
          >
            <span style={{ fontSize: '1.2rem', flexShrink: 0, width: 24, textAlign: 'center' }}>{item.icon}</span>
            {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>{item.label}</span>}
          </UnstyledButton>
        ))}

        {/* Cart */}
        <UnstyledButton
          onClick={() => { onCartToggle(); if (onClose) onClose() }}
          title="Cart"
          px={collapsed ? 8 : 14}
          py={12}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.65)',
            background: 'transparent',
            fontWeight: 500,
            fontSize: '0.95rem',
            width: '100%',
          }}
        >
          <Indicator label={cartCount} size={16} disabled={!cartCount} color="red" offset={4}>
            <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>🛒</span>
          </Indicator>
          {!collapsed && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</span>}
        </UnstyledButton>
      </Stack>

      {/* Footer */}
      <Box px={8} py={12} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!collapsed && user && (
          <Box px={14} py={8} mb={4}>
            <Text size="sm" fw={600} c="rgba(255,255,255,0.9)" truncate>{user.profile?.full_name || user.email}</Text>
            <Text size="xs" c="rgba(255,255,255,0.5)" tt="capitalize">{user.profile?.role}</Text>
          </Box>
        )}
        <UnstyledButton
          onClick={onSignOut}
          title="Sign Out"
          px={collapsed ? 8 : 14}
          py={12}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 10,
            color: 'rgba(255,255,255,0.65)',
            fontWeight: 500,
            fontSize: '0.95rem',
            width: '100%',
          }}
        >
          <span style={{ fontSize: '1.2rem', flexShrink: 0, width: 24, textAlign: 'center' }}>🚪</span>
          {!collapsed && <span>Sign Out</span>}
        </UnstyledButton>
      </Box>
    </Box>
  )
}

export default function Sidebar({ activeSection, onSectionChange, collapsed, onToggleCollapse, mobileOpen, onMobileClose, onSignOut, cartCount, onCartToggle }) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const width = collapsed ? 60 : 240

  if (isMobile) {
    return (
      <Drawer
        opened={mobileOpen}
        onClose={onMobileClose}
        size={240}
        withCloseButton={false}
        padding={0}
        styles={{ body: { padding: 0, height: '100%' }, content: { background: 'transparent' } }}
        zIndex={200}
      >
        <SidebarContent
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          collapsed={false}
          onSignOut={onSignOut}
          cartCount={cartCount}
          onCartToggle={onCartToggle}
          onClose={onMobileClose}
        />
      </Drawer>
    )
  }

  return (
    <Box
      component="aside"
      w={width}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
        transition: 'width 0.3s ease',
        boxShadow: '2px 0 15px rgba(0,0,0,0.1)',
      }}
    >
      <SidebarContent
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        onSignOut={onSignOut}
        cartCount={cartCount}
        onCartToggle={onCartToggle}
      />
    </Box>
  )
}
