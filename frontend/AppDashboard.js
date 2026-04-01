'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ActionIcon, Box, Center, Loader, SegmentedControl } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import Sidebar from './shared/Sidebar'
import { useAuth, ROLES } from './shared/auth'
import { salesOrderService, inventoryStockService, authService } from '../backend'
import InventoryDashboard from './inventory/InventoryDashboard'
import SalesOrderDashboard from './sales/SalesOrderDashboard'
import DispatchDashboard from './dispatch/DispatchDashboard'
import TeamManagement from './team/TeamManagement'
import CartDrawer from './inventory/CartDrawer'
import AddStockForm from './inventory/AddStockForm'
import CreateSalesOrderForm from './sales/CreateSalesOrderForm'
import CustomerManagement from './customer/CustomerManagement'

export default function AppDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeSection, setActiveSection] = useState('inventory')
  const [orderSubTab, setOrderSubTab] = useState('createorder')
  const [inventorySubTab, setInventorySubTab] = useState('view')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [salesOrders, setSalesOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  // Cart state — persists across tab switches
  const [cartItems, setCartItems] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  // Increment to force InventoryDashboard remount after order submit
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoadingOrders(true)
    const { data, error } = await salesOrderService.getAll()
    if (!error && data) {
      setSalesOrders(data)
    } else if (error) {
      console.error('Error fetching sales orders:', error)
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
      const existing = prev.find(c => c.inventory_stock_id === item.id)
      if (existing) {
        return prev.map(c =>
          c.inventory_stock_id === item.id ? { ...c, quantity } : c
        )
      }
      return [...prev, {
        inventory_stock_id: item.id,
        item_id: item.item_id,
        itemName: item.inventory_items?.name || 'Unknown',
        itemCategory: item.inventory_items?.item_category || '',
        quantity,
        maxAvailable: item.quantity - (item.blocked_qty || 0),
      }]
    })
  }

  function handleRemoveFromCart(stockId) {
    setCartItems(prev => prev.filter(c => c.inventory_stock_id !== stockId))
  }

  function handleUpdateCartQty(stockId, quantity) {
    setCartItems(prev =>
      prev.map(c => c.inventory_stock_id === stockId ? { ...c, quantity } : c)
    )
  }

  // ---- Create order from form (same logic as cart submit) ----

  async function handleCreateOrder(orderPayload) {
    const { data: stockData } = await inventoryStockService.getAll()
    if (!stockData) {
      alert('Failed to validate stock. Please try again.')
      return false
    }

    const errors = []
    for (const item of orderPayload.items) {
      const stock = stockData.find(s => s.id === item.inventory_stock_id)
      if (!stock) {
        errors.push(`Item not found in stock`)
        continue
      }
      const available = stock.quantity - (stock.blocked_qty || 0)
      if (item.quantity > available) {
        errors.push(`${stock.inventory_items?.name}: requested ${item.quantity}, only ${available} available`)
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

    for (const item of orderPayload.items) {
      const stock = stockData.find(s => s.id === item.inventory_stock_id)
      if (stock) {
        const newBlocked = (stock.blocked_qty || 0) + item.quantity
        await inventoryStockService.updateBlockedQty(stock.id, newBlocked, item.item_id)
      }
    }

    setSalesOrders(prev => [order, ...prev])
    setInventoryRefreshKey(prev => prev + 1)
    return true
  }

  // ---- Order submit (validate → create → block) ----

  async function handleSubmitOrder(customerInfo) {
    // 1. Validate availability against live DB
    const { data: stockData } = await inventoryStockService.getAll()
    if (!stockData) {
      alert('Failed to validate stock. Please try again.')
      return false
    }

    const errors = []
    for (const cartItem of cartItems) {
      const stock = stockData.find(s => s.id === cartItem.inventory_stock_id)
      if (!stock) {
        errors.push(`${cartItem.itemName}: item not found`)
        continue
      }
      const available = stock.quantity - (stock.blocked_qty || 0)
      if (cartItem.quantity > available) {
        errors.push(`${cartItem.itemName}: requested ${cartItem.quantity}, only ${available} available`)
      }
    }

    if (errors.length > 0) {
      alert('Order validation failed:\n\n' + errors.join('\n'))
      return false
    }

    // 2. Create order with line items
    const { data: order, error: createError } = await salesOrderService.create({
      customer_name: customerInfo.customer_name,
      customer_contact: customerInfo.customer_contact,
      notes: customerInfo.notes,
      items: cartItems.map(c => ({
        inventory_stock_id: c.inventory_stock_id,
        item_id: c.item_id,
        quantity: c.quantity,
      })),
    })

    if (createError || !order) {
      alert('Failed to create order. Please try again.')
      console.error('Create order error:', createError)
      return false
    }

    // 3. Block quantities for all line items
    for (const cartItem of cartItems) {
      const stock = stockData.find(s => s.id === cartItem.inventory_stock_id)
      if (stock) {
        const newBlocked = (stock.blocked_qty || 0) + cartItem.quantity
        await inventoryStockService.updateBlockedQty(stock.id, newBlocked, cartItem.item_id)
      }
    }

    // 4. Update state
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
      const { data: stockData } = await inventoryStockService.getAll()
      for (const lineItem of order.sales_order_items) {
        const stock = stockData?.find(s => s.id === lineItem.inventory_stock_id)
        if (stock) {
          const newBlocked = Math.max(0, (stock.blocked_qty || 0) - lineItem.quantity)
          await inventoryStockService.updateBlockedQty(stock.id, newBlocked, lineItem.item_id)
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
      const { data: stockData } = await inventoryStockService.getAll()
      for (const lineItem of order.sales_order_items) {
        const stock = stockData?.find(s => s.id === lineItem.inventory_stock_id)
        if (stock) {
          const newBlocked = Math.max(0, (stock.blocked_qty || 0) - lineItem.quantity)
          await inventoryStockService.updateBlockedQty(stock.id, newBlocked, lineItem.item_id)
          await inventoryStockService.reduceQuantity(stock.id, lineItem.quantity, lineItem.item_id)
        }
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
          overflowX: 'hidden',
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

        {/* Orders sub-tabs */}
        {activeSection === 'orders' && (
          <SegmentedControl
            value={orderSubTab}
            onChange={setOrderSubTab}
            data={[
              { value: 'createorder', label: 'Create Order' },
              { value: 'sales', label: 'Sales Orders' },
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
            loading={loadingOrders}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {activeSection === 'orders' && orderSubTab === 'dispatch' && (
          <DispatchDashboard
            orders={dispatchOrders}
            loading={loadingOrders}
            onDispatch={handleDispatch}
          />
        )}

        {activeSection === 'customers' && (
          <CustomerManagement />
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
