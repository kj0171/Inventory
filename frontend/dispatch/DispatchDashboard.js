'use client'

import { useState, useMemo } from 'react'
import { getStatusClass, formatDate } from '../shared/utils'

export default function DispatchDashboard({ orders, onDispatch }) {
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('approved')

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (searchFilter) {
        const search = searchFilter.toLowerCase()
        if (
          !order.item_name?.toLowerCase().includes(search) &&
          !order.customer_name?.toLowerCase().includes(search) &&
          !order.id?.toLowerCase().includes(search)
        ) return false
      }
      return true
    })
  }, [orders, statusFilter, searchFilter])

  const readyCount = orders.filter(o => o.status === 'approved').length
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length

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

        {filteredOrders.length === 0 ? (
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
                      <th>Item</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Approved On</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(order => (
                      <tr key={order.id}>
                        <td><span className="order-id">{order.id}</span></td>
                        <td>
                          <div className="item-info">
                            <strong className="item-name">{order.item_name}</strong>
                            <span className="item-category-text">{order.item_category}</span>
                          </div>
                        </td>
                        <td><strong>{order.customer_name}</strong></td>
                        <td>{order.customer_contact || '—'}</td>
                        <td><span className="quantity-badge quantity-medium">{order.quantity} units</span></td>
                        <td><span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span></td>
                        <td><span className="date-text">{formatDate(order.updated_at)}</span></td>
                        <td>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile view */}
            <div className="mobile-cards">
              {filteredOrders.map(order => (
                <div key={order.id} className="inventory-card">
                  <div className="card-header">
                    <h5 className="card-title">{order.item_name}</h5>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span>
                  </div>
                  <div className="card-details">
                    <div className="card-detail">
                      <div className="card-detail-label">Order ID</div>
                      <div className="card-detail-value">{order.id}</div>
                    </div>
                    <div className="card-detail">
                      <div className="card-detail-label">Quantity</div>
                      <div className="card-detail-value">{order.quantity} units</div>
                    </div>
                    <div className="card-detail">
                      <div className="card-detail-label">Customer</div>
                      <div className="card-detail-value">{order.customer_name}</div>
                    </div>
                    <div className="card-detail">
                      <div className="card-detail-label">Contact</div>
                      <div className="card-detail-value">{order.customer_contact || '—'}</div>
                    </div>
                  </div>
                  {order.status === 'approved' && (
                    <div className="card-actions">
                      <button className="btn-dispatch" onClick={() => onDispatch(order.id)}>Mark Dispatched</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
