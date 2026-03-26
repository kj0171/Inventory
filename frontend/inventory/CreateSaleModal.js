'use client'

import { useState } from 'react'
import { CURRENT_USER } from '../shared/auth'
import { salesOrderService, inventoryStockService } from '../../backend'

export default function CreateSaleModal({ item, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const available = item.quantity - (item.blocked_qty || 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const qty = Number(quantity)
    if (!quantity || isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity greater than 0')
      return
    }
    if (qty > available) {
      setError(`Quantity cannot exceed available stock (${available})`)
      return
    }
    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }

    setSubmitting(true)

    // Create sales order in DB
    const { data: order, error: createError } = await salesOrderService.create({
      inventory_stock_id: item.id,
      item_id: item.item_id,
      quantity: qty,
      customer_name: customerName.trim(),
      customer_contact: customerContact.trim(),
      notes: notes.trim(),
    })

    if (createError || !order) {
      setError('Failed to create sale order. Please try again.')
      console.error('Create sale error:', createError)
      setSubmitting(false)
      return
    }

    // Block the quantity in inventory
    const newBlocked = (item.blocked_qty || 0) + qty
    await inventoryStockService.updateBlockedQty(item.id, newBlocked, item.item_id)

    setSubmitting(false)
    onSubmit(order)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Sale Order</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="sale-item-info">
            <div className="sale-item-name">{item.inventory_items?.name || 'Unknown Item'}</div>
            <div className="sale-item-meta">
              <span>Category: {item.inventory_items?.item_category}</span>
              <span>Stock: {item.quantity}</span>
              <span>Available: {available}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                min="1"
                max={available}
                value={quantity}
                onChange={(e) => { setQuantity(e.target.value); setError('') }}
                placeholder={`Max: ${available}`}
                className="form-input"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Customer Name *</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setError('') }}
                placeholder="Enter customer name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Customer Contact</label>
              <input
                type="text"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder="Email or phone"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                className="form-input form-textarea"
                rows={3}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Sale Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
