'use client'

import { useState, useMemo, Fragment } from 'react'
import { getStatusClass, formatDate } from '../shared/utils'

export default function DispatchDashboard({ orders, loading, onDispatch }) {
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('approved')
  const [expandedOrders, setExpandedOrders] = useState({})

  function toggleExpand(orderId) {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (searchFilter) {
        const search = searchFilter.toLowerCase()
        const itemNames = (order.sales_order_items || [])
          .map(li => li.inventory_items?.name || '').join(' ').toLowerCase()
        if (
          !itemNames.includes(search) &&
          !order.customer_name?.toLowerCase().includes(search) &&
          !String(order.id).toLowerCase().includes(search)
        ) return false
      }
      return true
    })
  }, [orders, statusFilter, searchFilter])

  const readyCount = orders.filter(o => o.status === 'approved').length
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length

  function renderItemsSummary(items) {
    if (!items || items.length === 0) return 'No items'
    if (items.length === 1) return items[0].inventory_items?.name || 'Unknown'
    return `${items[0].inventory_items?.name || 'Unknown'} +${items.length - 1} more`
  }

  function getTotalQty(items) {
    return (items || []).reduce((sum, li) => sum + li.quantity, 0)
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card stat-card-warning">
          <div className="stat-number">{readyCount}</div>
          <div className="stat-label">Ready to Dispatch</div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-number">{dispatchedCount}</div>
          <div className="stat-label">Dispatched</div>
        </div>
      </div>

      <div className="filters-container">
        <div className="filters-header">
          <h3>Dispatch Queue</h3>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by item, customer, or order ID..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="approved">Ready to Dispatch</option>
              <option value="dispatched">Already Dispatched</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">
            Dispatch Orders
            <span className="results-count">({filteredOrders.length} orders)</span>
          </h2>
        </div>

        {loading ? (
          <div className="empty-state">
            <h3>Loading dispatch orders...</h3>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h3>No orders to dispatch</h3>
            <p>Orders will appear here once approved by an admin.</p>
          </div>
        ) : (
          <>
            {/* Desktop view */}
            <div className="desktop-table">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total Qty</th>
                      <th>Status</th>
                      <th>Approved On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => {
                      const items = order.sales_order_items || []
                      const isExpanded = expandedOrders[order.id]
                      return (
                        <Fragment key={order.id}>
                          <tr className="order-row clickable" onClick={() => toggleExpand(order.id)}>
                            <td><span className="order-id">#{order.id}</span></td>
                            <td>
                              <div className="customer-info">
                                <strong>{order.customer_name}</strong>
                                {order.customer_contact && (
                                  <span className="customer-contact">{order.customer_contact}</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="item-info">
                                <strong className="item-name">{renderItemsSummary(items)}</strong>
                                <span className="item-category-text">{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                              </div>
                            </td>
                            <td><span className="quantity-badge quantity-medium">{getTotalQty(items)} units</span></td>
                            <td><span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span></td>
                            <td><span className="date-text">{formatDate(order.updated_at)}</span></td>
                            <td onClick={(e) => e.stopPropagation()}>
                              {order.status === 'approved' && (
                                <button className="btn-dispatch" onClick={() => onDispatch(order.id)}>
                                  Mark Dispatched
                                </button>
                              )}
                              {order.status === 'dispatched' && (
                                <span className="dispatched-label">Completed</span>
                              )}
                            </td>
                          </tr>
                          {isExpanded && items.map(li => (
                            <tr key={li.id} className="line-item-row">
                              <td></td>
                              <td colSpan={2}>
                                <div className="line-item-detail">
                                  <span className="line-item-name">{li.inventory_items?.name || 'Unknown'}</span>
                                  <span className="line-item-category">{li.inventory_items?.item_category || ''}</span>
                                </div>
                              </td>
                              <td><span className="quantity-badge">{li.quantity} units</span></td>
                              <td colSpan={3}></td>
                            </tr>
                          ))}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile view */}
            <div className="mobile-cards">
              {filteredOrders.map(order => {
                const items = order.sales_order_items || []
                const isExpanded = expandedOrders[order.id]
                return (
                  <div key={order.id} className="inventory-card">
                    <div className="card-header" onClick={() => toggleExpand(order.id)}>
                      <h5 className="card-title">{order.customer_name}</h5>
                      <span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span>
                    </div>
                    <div className="card-details">
                      <div className="card-detail">
                        <div className="card-detail-label">Order ID</div>
                        <div className="card-detail-value">#{order.id}</div>
                      </div>
                      <div className="card-detail">
                        <div className="card-detail-label">Items</div>
                        <div className="card-detail-value">{renderItemsSummary(items)}</div>
                      </div>
                      <div className="card-detail">
                        <div className="card-detail-label">Total Qty</div>
                        <div className="card-detail-value">{getTotalQty(items)} units</div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="order-line-items-mobile">
                        {items.map(li => (
                          <div key={li.id} className="line-item-mobile">
                            <span className="line-item-name">{li.inventory_items?.name || 'Unknown'}</span>
                            <span className="line-item-qty">{li.quantity} units</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {order.status === 'approved' && (
                      <div className="card-actions">
                        <button className="btn-dispatch" onClick={() => onDispatch(order.id)}>Mark Dispatched</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
