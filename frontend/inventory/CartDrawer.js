'use client'

import { useState } from 'react'

export default function CartDrawer({ cartItems, isOpen, onToggle, onUpdateQty, onRemoveItem, onSubmitOrder }) {
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalItems = cartItems.reduce((sum, c) => sum + c.quantity, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!customerName.trim()) {
      alert('Customer name is required')
      return
    }
    setSubmitting(true)
    const success = await onSubmitOrder({
      customer_name: customerName.trim(),
      customer_contact: customerContact.trim(),
      notes: notes.trim(),
    })
    setSubmitting(false)
    if (success) {
      setCustomerName('')
      setCustomerContact('')
      setNotes('')
    }
  }

  return (
    <>
      {/* Floating cart button */}
      <button className="cart-fab" onClick={onToggle}>
        🛒 {cartItems.length > 0 && <span className="cart-fab-badge">{cartItems.length}</span>}
      </button>

      {/* Drawer overlay */}
      {isOpen && <div className="cart-overlay" onClick={onToggle} />}

      {/* Drawer */}
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <h3>Cart ({cartItems.length} items, {totalItems} units)</h3>
          <button className="modal-close" onClick={onToggle}>✕</button>
        </div>

        <div className="cart-drawer-body">
          {cartItems.length === 0 ? (
            <div className="empty-state"><p>Cart is empty. Add items from the inventory.</p></div>
          ) : (
            <>
              <div className="cart-items-list">
                {cartItems.map(item => (
                  <div key={item.inventory_stock_id} className="cart-item">
                    <div className="cart-item-info">
                      <strong>{item.itemName}</strong>
                      <span className="cart-item-category">{item.itemCategory}</span>
                    </div>
                    <div className="cart-item-controls">
                      <input
                        type="number"
                        min="1"
                        max={item.maxAvailable}
                        value={item.quantity}
                        onChange={(e) => onUpdateQty(item.inventory_stock_id, Math.max(1, Math.min(item.maxAvailable, Number(e.target.value) || 1)))}
                        className="cart-qty-input"
                      />
                      <button className="cart-remove-btn" onClick={() => onRemoveItem(item.inventory_stock_id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="cart-customer-form">
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Contact</label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    placeholder="Phone or email"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Order notes (optional)"
                    className="form-input"
                    rows={2}
                  />
                </div>
                <button type="submit" className="btn-submit cart-submit-btn" disabled={submitting || cartItems.length === 0}>
                  {submitting ? 'Placing Order...' : `Place Order (${totalItems} units)`}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  )
}
