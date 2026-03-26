'use client'

import { useState, useMemo } from 'react'
import { CURRENT_USER, ROLES } from '../shared/auth'
import { getStatusClass, formatDate } from '../shared/utils'

export default function SalesOrderDashboard({ orders, onApprove, onReject }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')

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

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  }), [orders])

  const isAdmin = CURRENT_USER.role === ROLES.ADMIN

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-number">{stats.pending}</div>
          <div className="stat-label">Pending Approval</div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-number">{stats.approved}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.dispatched}</div>
          <div className="stat-label">Dispatched</div>
        </div>
      </div>

      <div className="filters-container">
        <div className="filters-header">
          <h3>Sales Orders</h3>
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
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="dispatched">Dispatched</option>
            </select>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">
            Order List
            <span className="results-count">({filteredOrders.length} orders)</span>
          </h2>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h3>No sales orders found</h3>
            <p>Create a sale from the Inventory tab to get started.</p>
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
                      <th>Qty</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Created By</th>
                      {isAdmin && <th>Actions</th>}
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
                        <td>
                          <div className="customer-info">
                            <strong>{order.customer_name}</strong>
                            {order.customer_contact && (
                              <span className="customer-contact">{order.customer_contact}</span>
                            )}
                          </div>
                        </td>
                        <td><span className="quantity-badge quantity-medium">{order.quantity} units</span></td>
                        <td><span className={`status-badge ${getStatusClass(order.status)}`}>{order.status}</span></td>
                        <td><span className="date-text">{formatDate(order.created_at)}</span></td>
                        <td>{order.created_by_name}</td>
                        {isAdmin && (
                          <td>
                            {order.status === 'pending' && (
                              <div className="action-buttons">
                                <button className="btn-approve" onClick={() => onApprove(order.id)}>Approve</button>
                                <button className="btn-reject" onClick={() => onReject(order.id)}>Reject</button>
                              </div>
                            )}
                          </td>
                        )}
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
                      <div className="card-detail-label">Created</div>
                      <div className="card-detail-value">{formatDate(order.created_at)}</div>
                    </div>
                  </div>
                  {isAdmin && order.status === 'pending' && (
                    <div className="card-actions">
                      <div className="action-buttons">
                        <button className="btn-approve" onClick={() => onApprove(order.id)}>Approve</button>
                        <button className="btn-reject" onClick={() => onReject(order.id)}>Reject</button>
                      </div>
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
