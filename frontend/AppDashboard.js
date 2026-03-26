'use client'

import { useState, useEffect, useCallback } from 'react'
import TabNavigation from './shared/TabNavigation'
import { CURRENT_USER } from './shared/auth'
import { salesOrderService, inventoryStockService } from '../backend'
import InventoryDashboard from './inventory/InventoryDashboard'
import SalesOrderDashboard from './sales/SalesOrderDashboard'
import DispatchDashboard from './dispatch/DispatchDashboard'

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [salesOrders, setSalesOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)

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

  function handleSaleCreated(order) {
    setSalesOrders(prev => [order, ...prev])
  }

  async function handleApprove(orderId) {
    const { data, error } = await salesOrderService.updateStatus(orderId, 'approved')
    if (error) {
      console.error('Error approving order:', error)
      alert('Failed to approve order.')
      return
    }
    setSalesOrders(prev => prev.map(o => o.id === orderId ? data : o))
  }

  async function handleReject(orderId) {
    // Find the order to unblock its quantity
    const order = salesOrders.find(o => o.id === orderId)

    const { data, error } = await salesOrderService.updateStatus(orderId, 'rejected')
    if (error) {
      console.error('Error rejecting order:', error)
      alert('Failed to reject order.')
      return
    }
    setSalesOrders(prev => prev.map(o => o.id === orderId ? data : o))

    // Unblock the quantity
    if (order) {
      const { data: stockData } = await inventoryStockService.getAll()
      const stock = stockData?.find(s => s.id === order.inventory_stock_id)
      if (stock) {
        const newBlocked = Math.max(0, (stock.blocked_qty || 0) - order.quantity)
        await inventoryStockService.updateBlockedQty(stock.id, newBlocked, order.item_id)
      }
    }
  }

  async function handleDispatch(orderId) {
    const order = salesOrders.find(o => o.id === orderId)

    const { data, error } = await salesOrderService.updateStatus(orderId, 'dispatched')
    if (error) {
      console.error('Error dispatching order:', error)
      alert('Failed to dispatch order.')
      return
    }
    setSalesOrders(prev => prev.map(o => o.id === orderId ? data : o))

    // Reduce both blocked_qty and quantity on dispatch
    if (order) {
      const { data: stockData } = await inventoryStockService.getAll()
      const stock = stockData?.find(s => s.id === order.inventory_stock_id)
      if (stock) {
        const newBlocked = Math.max(0, (stock.blocked_qty || 0) - order.quantity)
        await inventoryStockService.updateBlockedQty(stock.id, newBlocked, order.item_id)
        await inventoryStockService.reduceQuantity(stock.id, order.quantity, order.item_id)
      }
    }
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
        <InventoryDashboard onSaleCreated={handleSaleCreated} />
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
    </div>
  )
}
