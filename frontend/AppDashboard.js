'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './shared/Sidebar'
import { useAuth, ROLES } from './shared/auth'
import { salesOrderService, inventoryStockService, authService } from '../backend'
import InventoryDashboard from './inventory/InventoryDashboard'
import SalesOrderDashboard from './sales/SalesOrderDashboard'
import DispatchDashboard from './dispatch/DispatchDashboard'
import TeamManagement from './team/TeamManagement'
import CartDrawer from './inventory/CartDrawer'

export default function AppDashboard() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [activeSection, setActiveSection] = useState('inventory')
  const [orderSubTab, setOrderSubTab] = useState('sales')
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

  async function handleSignOut() {
    await authService.signOut()
    router.push('/')
  }

  // Early returns AFTER all hooks
  if (authLoading) {
    return (
      <div className="signin-wrapper">
        <div className="signin-card" style={{ textAlign: 'center', padding: '60px 30px' }}>
          <p style={{ color: '#666' }}>Loading...</p>
        </div>
      </div>
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
    <div className="app-layout">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className={`main-content ${sidebarCollapsed ? 'main-content-expanded' : ''}`}>
        <div className="content-header">
          <div className="content-header-left">
            <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>☰</button>
            <div>
              <h1 className="content-title">
                {activeSection === 'inventory' && 'Inventory'}
                {activeSection === 'orders' && 'Orders'}
                {activeSection === 'team' && 'Team'}
              </h1>
              <p className="content-subtitle">
                {activeSection === 'inventory' && 'Stock management and tracking'}
                {activeSection === 'orders' && 'Sales orders and dispatch workflow'}
                {activeSection === 'team' && 'Manage employees and roles'}
              </p>
            </div>
          </div>
          <div className="user-info">
            <span className="user-name">{user.profile?.full_name || user.email}</span>
            <span className="user-role">{user.profile?.role}</span>
            <button className="btn-signout" onClick={handleSignOut}>Sign Out</button>
          </div>
        </div>

        {/* Orders sub-tabs */}
        {activeSection === 'orders' && (
          <div className="sub-tabs">
            <button
              className={`sub-tab ${orderSubTab === 'sales' ? 'sub-tab-active' : ''}`}
              onClick={() => setOrderSubTab('sales')}
            >
              Sales Orders
            </button>
            <button
              className={`sub-tab ${orderSubTab === 'dispatch' ? 'sub-tab-active' : ''}`}
              onClick={() => setOrderSubTab('dispatch')}
            >
              Dispatch
            </button>
          </div>
        )}

        {activeSection === 'inventory' && (
          <InventoryDashboard
            key={inventoryRefreshKey}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
          />
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
      </div>
    </div>
  )
}
