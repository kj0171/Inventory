'use client'

import { useState } from 'react'
import TabNavigation from './shared/TabNavigation'
import { CURRENT_USER } from './shared/auth'
import { DUMMY_SALES_ORDERS } from './shared/dummyData'
import InventoryDashboard from './inventory/InventoryDashboard'
import SalesOrderDashboard from './sales/SalesOrderDashboard'
import DispatchDashboard from './dispatch/DispatchDashboard'

export default function AppDashboard() {
  const [activeTab, setActiveTab] = useState('inventory')
  const [salesOrders, setSalesOrders] = useState(DUMMY_SALES_ORDERS)

  function handleSaleCreated(saleData) {
    setSalesOrders(prev => [saleData, ...prev])
  }

  function handleApprove(orderId) {
    setSalesOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'approved', approved_by: CURRENT_USER.id, approved_by_name: CURRENT_USER.full_name, updated_at: new Date().toISOString() }
        : o
    ))
  }

  function handleReject(orderId) {
    setSalesOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'rejected', approved_by: CURRENT_USER.id, approved_by_name: CURRENT_USER.full_name, updated_at: new Date().toISOString() }
        : o
    ))
  }

  function handleDispatch(orderId) {
    setSalesOrders(prev => prev.map(o =>
      o.id === orderId
        ? { ...o, status: 'dispatched', dispatched_by: CURRENT_USER.id, dispatched_by_name: CURRENT_USER.full_name, updated_at: new Date().toISOString() }
        : o
    ))
  }

  // For dispatch tab, only show approved + dispatched orders
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
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      {activeTab === 'dispatch' && (
        <DispatchDashboard
          orders={dispatchOrders}
          onDispatch={handleDispatch}
        />
      )}
    </div>
  )
}
