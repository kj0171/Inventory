'use client'

import { useState } from 'react'

export default function AddToCartModal({ item, currentCartQty, onClose, onAdd }) {
  const available = item.quantity - (item.blocked_qty || 0)
  const [quantity, setQuantity] = useState(currentCartQty || 1)

  function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0 || qty > available) return
    onAdd(item, qty)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add to Cart</h3>
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
          {currentCartQty > 0 && (
            <div className="cart-already-note">Already in cart: {currentCartQty} units</div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                min="1"
                max={available}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={`Max: ${available}`}
                className="form-input"
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-submit" disabled={!quantity || Number(quantity) <= 0 || Number(quantity) > available}>
                {currentCartQty > 0 ? 'Update Cart' : 'Add to Cart'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
