'use client'

import { useState, useEffect, useCallback } from 'react'
import TabNavigation from './shared/TabNavigation'
import { CURRENT_USER } from './shared/auth'
import { salesOrderService, inventoryStockService } from '../backend'
import InventoryDashboard from './inventory/InventoryDashboard'
import SalesOrderDashboard from './sales/SalesOrderDashboard'
import DispatchDashboard from './dispatch/DispatchDashboard'
import CartDrawer from './inventory/CartDrawer'

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState('inventory')
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
    fetchOrders()
  }, [fetchOrders])

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
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="header-top">
          <div>
            <h1 className="dashboard-title">Inventory Management</h1>
            <p className="dashboard-subtitle">Sales order workflow with inventory tracking</p>
          </div>
          <div className="user-info">
            <span className="user-name">{CURRENT_USER.full_name}</span>
            <span className="user-role">{CURRENT_USER.role}</span>
          </div>
        </div>
      </div>

      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'inventory' && (
        <InventoryDashboard
          key={inventoryRefreshKey}
          cartItems={cartItems}
          onAddToCart={handleAddToCart}
        />
      )}

      {activeTab === 'sales' && (
        <SalesOrderDashboard
          orders={salesOrders}
          loading={loadingOrders}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {activeTab === 'dispatch' && (
        <DispatchDashboard
          orders={dispatchOrders}
          loading={loadingOrders}
          onDispatch={handleDispatch}
        />
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
  )
}
