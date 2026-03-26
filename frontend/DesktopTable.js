import { useState } from 'react'
import { getCategoryClass, getQuantityClass } from './utils'

export default function DesktopTable({
  groupedData, collapsedCategories, collapsedItemGroups,
  onToggleCategory, onToggleItemGroup, onBlockInventory, onUnblockInventory
}) {
  const [blockingItemId, setBlockingItemId] = useState(null)
  const [blockQty, setBlockQty] = useState('')
  const [blockError, setBlockError] = useState('')
  const [unblockingItemId, setUnblockingItemId] = useState(null)
  const [unblockQty, setUnblockQty] = useState('')
  const [unblockError, setUnblockError] = useState('')

  function openBlockDialog(item) {
    setBlockingItemId(item.id)
    setBlockQty('')
    setBlockError('')
  }

  function closeBlockDialog() {
    setBlockingItemId(null)
    setBlockQty('')
    setBlockError('')
  }

  function handleBlockSubmit(item) {
    const qty = Number(blockQty)
    if (!blockQty || isNaN(qty) || qty <= 0) {
      setBlockError('Please enter a valid quantity greater than 0')
      return
    }
    const currentBlocked = item.blocked_qty || 0
    const available = item.quantity - currentBlocked
    if (qty > available) {
      setBlockError(`Quantity cannot exceed available stock (${available})`)
      return
    }
    onBlockInventory(item.id, currentBlocked + qty)
    closeBlockDialog()
  }

  function openUnblockDialog(item) {
    setUnblockingItemId(item.id)
    setUnblockQty('')
    setUnblockError('')
    closeBlockDialog()
  }

  function closeUnblockDialog() {
    setUnblockingItemId(null)
    setUnblockQty('')
    setUnblockError('')
  }

  function handleUnblockSubmit(item) {
    const qty = Number(unblockQty)
    if (!unblockQty || isNaN(qty) || qty <= 0) {
      setUnblockError('Please enter a valid quantity greater than 0')
      return
    }
    const currentBlocked = item.blocked_qty || 0
    if (qty > currentBlocked) {
      setUnblockError(`Quantity cannot exceed blocked stock (${currentBlocked})`)
      return
    }
    onUnblockInventory(item.id, currentBlocked - qty)
    closeUnblockDialog()
  }
  return (
    <div className="desktop-table">
      {Object.entries(groupedData).map(([category, itemGroups]) => {
        const isCategoryCollapsed = collapsedCategories[category]
        const totalCategoryItems = Object.values(itemGroups).flat().length

        return (
          <div key={category} className="category-section">
            <div className="category-header" onClick={() => onToggleCategory(category)}>
              <div className="category-header-content">
                <h3 className="category-title">
                  <span className={`category-badge ${getCategoryClass(category)}`}>
                    {category}
                  </span>
                  <span className="category-count">({totalCategoryItems} items in {Object.keys(itemGroups).length} groups)</span>
                </h3>
                <div className="collapse-btn">
                  <span className={`collapse-icon ${isCategoryCollapsed ? 'collapsed' : 'expanded'}`}>
                    {isCategoryCollapsed ? '▶' : '▼'}
                  </span>
                </div>
              </div>
            </div>
            <div className={`category-content ${isCategoryCollapsed ? 'collapsed' : 'expanded'}`}>
              {Object.entries(itemGroups).map(([itemGroup, items]) => {
                const itemGroupKey = `${category}:${itemGroup}`
                const isItemGroupCollapsed = collapsedItemGroups[itemGroupKey]

                return (
                  <div key={itemGroup} className="item-group-section">
                    <div className="item-group-header" onClick={() => onToggleItemGroup(category, itemGroup)}>
                      <div className="item-group-header-content">
                        <h4 className="item-group-title">
                          <span className="item-group-badge">{itemGroup}</span>
                          <span className="item-group-count">({items.length} items)</span>
                        </h4>
                        <div className="collapse-btn-small">
                          <span className={`collapse-icon ${isItemGroupCollapsed ? 'collapsed' : 'expanded'}`}>
                            {isItemGroupCollapsed ? '▶' : '▼'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`item-group-content ${isItemGroupCollapsed ? 'collapsed' : 'expanded'}`}>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Item Name</th>
                              <th>Stock Level</th>
                              <th>Blocked Qty</th>
                              <th>Last Updated</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((row, i) => (
                              <tr key={i}>
                                <td>
                                  <div className="item-info">
                                    <strong className="item-name" title={row.inventory_items?.name || 'Unknown Item'}>
                                      {row.inventory_items?.name || 'Unknown Item'}
                                    </strong>
                                  </div>
                                </td>
                                <td>
                                  <span className={`quantity-badge ${getQuantityClass(row.quantity)}`}>
                                    {row.quantity} units
                                  </span>
                                </td>
                                <td>
                                  <span className="quantity-badge blocked-qty-badge">
                                    {row.blocked_qty || 0} units
                                  </span>
                                </td>
                                <td>
                                  <span className="date-text">
                                    <span className="date-full">
                                      {new Date(row.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit'
                                      })}
                                    </span>
                                    <span className="date-compact">
                                      {new Date(row.created_at).toLocaleDateString('en-US', {
                                        month: 'short', day: 'numeric'
                                      })}
                                    </span>
                                  </span>
                                </td>
                                <td>
                                  {blockingItemId === row.id ? (
                                    <div className="block-inline-form">
                                      <input
                                        type="number"
                                        min="1"
                                        max={row.quantity}
                                        value={blockQty}
                                        onChange={(e) => { setBlockQty(e.target.value); setBlockError('') }}
                                        placeholder="Qty"
                                        className="block-qty-input"
                                        autoFocus
                                      />
                                      <button className="btn-confirm-block" onClick={() => handleBlockSubmit(row)}>✓</button>
                                      <button className="btn-cancel-block" onClick={closeBlockDialog}>✕</button>
                                      {blockError && <div className="block-error">{blockError}</div>}
                                    </div>
                                  ) : unblockingItemId === row.id ? (
                                    <div className="block-inline-form">
                                      <input
                                        type="number"
                                        min="1"
                                        max={row.blocked_qty || 0}
                                        value={unblockQty}
                                        onChange={(e) => { setUnblockQty(e.target.value); setUnblockError('') }}
                                        placeholder="Qty"
                                        className="block-qty-input"
                                        autoFocus
                                      />
                                      <button className="btn-confirm-block" onClick={() => handleUnblockSubmit(row)}>✓</button>
                                      <button className="btn-cancel-block" onClick={closeUnblockDialog}>✕</button>
                                      {unblockError && <div className="block-error">{unblockError}</div>}
                                    </div>
                                  ) : (
                                    <div className="action-buttons">
                                      <button className="btn-block" onClick={() => openBlockDialog(row)}>Block</button>
                                      {(row.blocked_qty || 0) > 0 && (
                                        <button className="btn-unblock" onClick={() => openUnblockDialog(row)}>Unblock</button>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
