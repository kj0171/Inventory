'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ActionIcon, Badge, Box, Center, Loader, SegmentedControl, Stack, Text } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import Sidebar from './shared/Sidebar'
import { useAuth, ROLES } from './shared/auth'
import { salesOrderService, inventoryItemService, authService, customerService } from '../backend'
import InventoryDashboard from './inventory/InventoryDashboard'
import SalesOrderDashboard from './sales/SalesOrderDashboard'
import DispatchDashboard from './dispatch/DispatchDashboard'
import ReceiptBarcodeRegistration from './dispatch/ReceiptBarcodeRegistration'
import TeamManagement from './team/TeamManagement'
import CartDrawer from './inventory/CartDrawer'
import AddStockForm from './inventory/AddStockForm'
import CreateSalesOrderForm from './sales/CreateSalesOrderForm'
import CustomerManagement from './customer/CustomerManagement'
import SupplierManagement from './supplier/SupplierManagement'
import { TRACKING_ENABLED } from './shared/trackingConfig'

export default function AppDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeSection, setActiveSection] = useState('inventory')
  const [orderSubTab, setOrderSubTab] = useState('createorder')
  const [inventorySubTab, setInventorySubTab] = useState('view')
  const [dispatchSubTab, setDispatchSubTab] = useState('registration')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [salesOrders, setSalesOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [customersMap, setCustomersMap] = useState({})

  // Cart state — persists across tab switches
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  // Increment to force InventoryDashboard remount after order submit
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    const [ordersRes, custRes] = await Promise.all([
      salesOrderService.getAll(),
      customerService.getAll(),
    ])
    if (!custRes.error && custRes.data) {
      const map = {}
      custRes.data.forEach(c => { map[c.id] = c })
      setCustomersMap(map)
    }
    if (!ordersRes.error && ordersRes.data) {
      setSalesOrders(ordersRes.data)
    } else if (ordersRes.error) {
      console.error('Error fetching sales orders:', ordersRes.error)
    }
    setLoadingOrders(false)
  }, [])

  useEffect(() => {
    if (user) fetchOrders()
  }, [fetchOrders, user])

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [authLoading, user, router])

  const isMobile = useMediaQuery('(max-width: 768px)')
  const sidebarWidth = sidebarCollapsed ? 60 : 240

  async function handleSignOut() {
    await authService.signOut()
    router.push('/')
  }

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <Center mih="100vh">
        <Loader size="lg" />
      </Center>
    )
  }

  if (!user) return null

  // ---- Cart handlers ----

  function handleAddToCart(item, quantity) {
    setCartItems(prev => {
      const existing = prev.find(c => c.item_id === item.id)
      if (existing) {
        return prev.map(c =>
          c.item_id === item.id ? { ...c, quantity } : c
        )
      }
      return [...prev, {
        item_id: item.id,
        itemName: item.name || 'Unknown',
        itemCategory: item.item_category || '',
        quantity,
        maxAvailable: (item.quantity || 0) - (item.blocked_qty || 0),
      }]
    })
  }

  function handleRemoveFromCart(itemId) {
    setCartItems(prev => prev.filter(c => c.item_id !== itemId))
  }

  function handleUpdateCartQty(itemId, quantity) {
    setCartItems(prev =>
      prev.map(c => c.item_id === itemId ? { ...c, quantity } : c)
    )
  }

  // ---- Create order from form ----

  async function handleCreateOrder(orderPayload) {
    const { data: items } = await inventoryItemService.getAll()
    if (!items) {
      alert('Failed to validate stock. Please try again.')
      return false
    }

    const errors = []
    for (const lineItem of orderPayload.items) {
      const item = items.find(i => i.id === lineItem.item_id)
      if (!item) {
        errors.push(`Item not found`)
        continue
      }
      const available = (item.quantity || 0) - (item.blocked_qty || 0)
      if (lineItem.quantity > available) {
        errors.push(`${item.name}: requested ${lineItem.quantity}, only ${available} available`)
      }
    }

    if (errors.length > 0) {
      alert('Order validation failed:\n\n' + errors.join('\n'))
      return false
    }

    const { data: order, error: createError } = await salesOrderService.create(orderPayload)
    if (createError || !order) {
      alert('Failed to create order. Please try again.')
      return false
    }

    for (const lineItem of orderPayload.items) {
      const item = items.find(i => i.id === lineItem.item_id)
      if (item) {
        const newBlocked = (item.blocked_qty || 0) + lineItem.quantity
        await inventoryItemService.updateBlockedQty(item.id, newBlocked)
      }
    }

    setSalesOrders(prev => [order, ...prev])
    setInventoryRefreshKey(prev => prev + 1)
    return true
  }

  // ---- Order submit from cart (validate → create → block) ----

  async function handleSubmitOrder(customerInfo) {
    const { data: items } = await inventoryItemService.getAll()
    if (!items) {
      alert('Failed to validate stock. Please try again.')
      return false
    }

    const errors = []
    for (const cartItem of cartItems) {
      const item = items.find(i => i.id === cartItem.item_id)
      if (!item) {
        errors.push(`${cartItem.itemName}: item not found`)
        continue
      }
      const available = (item.quantity || 0) - (item.blocked_qty || 0)
      if (cartItem.quantity > available) {
        errors.push(`${cartItem.itemName}: requested ${cartItem.quantity}, only ${available} available`)
      }
    }

    if (errors.length > 0) {
      alert('Order validation failed:\n\n' + errors.join('\n'))
      return false
    }

    const { data: order, error: createError } = await salesOrderService.create({
      customer_id: customerInfo.customer_id,
      notes: customerInfo.notes,
      items: cartItems.map(c => ({
        item_id: c.item_id,
        quantity: c.quantity,
      })),
    })

    if (createError || !order) {
      alert('Failed to create order. Please try again.')
      console.error('Create order error:', createError)
      return false
    }

    for (const cartItem of cartItems) {
      const item = items.find(i => i.id === cartItem.item_id)
      if (item) {
        const newBlocked = (item.blocked_qty || 0) + cartItem.quantity
        await inventoryItemService.updateBlockedQty(item.id, newBlocked)
      }
    }

    setSalesOrders(prev => [order, ...prev])
    setCartItems([])
    setCartOpen(false)
    setInventoryRefreshKey(prev => prev + 1)
    return true
  }

  // ---- Order status handlers ----

  async function handleApprove(orderId) {
    const { data, error } = await salesOrderService.updateStatus(orderId, 'approved')
    if (error) {
      alert('Failed to approve order.')
      return
    }
    setSalesOrders(prev => prev.map(o => o.id === orderId ? data : o))
  }

  async function handleReject(orderId) {
    const order = salesOrders.find(o => o.id === orderId)

    const { data, error } = await salesOrderService.updateStatus(orderId, 'rejected')
    if (error) {
      alert('Failed to reject order.')
      return
    }
    setSalesOrders(prev => prev.map(o => o.id === orderId ? data : o))

    // Unblock quantities for all line items
    if (order?.sales_order_items) {
      for (const lineItem of order.sales_order_items) {
        const { data: item } = await inventoryItemService.getById(lineItem.item_id)
        if (item) {
          const newBlocked = Math.max(0, (item.blocked_qty || 0) - lineItem.quantity)
          await inventoryItemService.updateBlockedQty(item.id, newBlocked)
        }
      }
    }
    setInventoryRefreshKey(prev => prev + 1)
  }

  async function handleDispatch(orderId) {
    const order = salesOrders.find(o => o.id === orderId)

    const { data, error } = await salesOrderService.updateStatus(orderId, 'dispatched')
    if (error) {
      alert('Failed to dispatch order.')
      return
    }
    setSalesOrders(prev => prev.map(o => o.id === orderId ? data : o))

    // Reduce quantity + unblock for all line items
    if (order?.sales_order_items) {
      for (const lineItem of order.sales_order_items) {
        await inventoryItemService.reduceQuantity(lineItem.item_id, lineItem.quantity)
      }
    }
    setInventoryRefreshKey(prev => prev + 1)
  }

  const dispatchOrders = salesOrders.filter(o => o.status === 'approved' || o.status === 'dispatched')


  return (
    <Box style={{ display: 'flex', minHeight: '100vh', overflow: 'hidden', width: '100%' }}>
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onSignOut={handleSignOut}
        cartCount={cartItems.length}
        onCartToggle={() => setCartOpen(!cartOpen)}
      />

      <Box
        component="main"
        style={{
          marginLeft: isMobile ? 0 : sidebarWidth,
          flex: 1,
          padding: isMobile ? 15 : 30,
          transition: 'margin-left 0.3s ease',
          maxWidth: isMobile ? '100%' : `calc(100% - ${sidebarWidth}px)`,
          overflowX: 'auto',
        }}
      >
        {isMobile && (
          <ActionIcon
            variant="subtle"
            color="dark"
            size="lg"
            onClick={() => setMobileMenuOpen(true)}
            mb="xs"
          >
            <span style={{ fontSize: '1.4rem' }}>☰</span>
          </ActionIcon>
        )}

        {/* Inventory sub-tabs */}
        {activeSection === 'inventory' && (
          <SegmentedControl
            value={inventorySubTab}
            onChange={setInventorySubTab}
            data={[
              { value: 'view', label: 'Stock View' },
              ...(user.profile?.role === ROLES.ADMIN ? [{ value: 'addstock', label: 'Add Stock' }] : []),
            ]}
            mb="md"
          />
        )}

        {activeSection === 'orders' && (
          <SegmentedControl
            value={orderSubTab}
            onChange={setOrderSubTab}
            data={[
              { value: 'createorder', label: 'Create Order' },
              { value: 'sales', label: 'Sales Orders' },
            ]}
            mb="md"
          />
        )}

        {/* Dispatch sub-tabs */}
        {activeSection === 'dispatch' && (
          <SegmentedControl
            value={dispatchSubTab}
            onChange={setDispatchSubTab}
            data={[
              { value: 'registration', label: TRACKING_ENABLED ? 'Registration' : '🔒 Registration' },
              { value: 'dispatch', label: 'Dispatch' },
            ]}
            mb="md"
          />
        )}

        {activeSection === 'inventory' && inventorySubTab === 'view' && (
          <InventoryDashboard
            key={inventoryRefreshKey}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
          />
        )}

        {activeSection === 'inventory' && inventorySubTab === 'addstock' && (
          <AddStockForm onStockAdded={() => setInventoryRefreshKey(prev => prev + 1)} />
        )}

        {activeSection === 'orders' && orderSubTab === 'createorder' && (
          <CreateSalesOrderForm onOrderCreated={handleCreateOrder} />
        )}

        {activeSection === 'orders' && orderSubTab === 'sales' && (
          <SalesOrderDashboard
            orders={salesOrders}
            customersMap={customersMap}
            loading={loadingOrders}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {activeSection === 'dispatch' && dispatchSubTab === 'registration' && (
          TRACKING_ENABLED ? (
            <ReceiptBarcodeRegistration />
          ) : (
            <Center py={80}>
              <Stack align="center" gap="md" maw={400}>
                <Text style={{ fontSize: 48 }}>🔒</Text>
                <Text fw={700} size="xl" ta="center">Item-Level Tracking</Text>
                <Text c="dimmed" ta="center" size="sm">
                  Enable item-level tracking to unlock barcode registration, unit scanning, and per-unit traceability across your inventory and dispatch workflows.
                </Text>
                <Badge variant="light" color="blue" size="lg">Contact your admin to enable</Badge>
              </Stack>
            </Center>
          )
        )}

        {activeSection === 'dispatch' && dispatchSubTab === 'dispatch' && (
          <DispatchDashboard
            orders={dispatchOrders}
            customersMap={customersMap}
            loading={loadingOrders}
            onDispatch={handleDispatch}
          />
        )}

        {activeSection === 'customers' && (
          <CustomerManagement />
        )}

        {activeSection === 'suppliers' && (
          <SupplierManagement />
        )}

        {activeSection === 'team' && (
          <TeamManagement />
        )}

        <CartDrawer
          cartItems={cartItems}
          isOpen={cartOpen}
          onToggle={() => setCartOpen(!cartOpen)}
          onUpdateQty={handleUpdateCartQty}
          onRemoveItem={handleRemoveFromCart}
          onSubmitOrder={handleSubmitOrder}
        />
      </Box>
    </Box>
  )
}
