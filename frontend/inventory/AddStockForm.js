'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { inventoryStockService } from '../../backend'

const EMPTY_ROW = { mode: 'existing', itemId: '', name: '', item_category: '', item_group: '', quantity: '', searchText: '' }

function SearchableSelect({ options, value, onChange, placeholder, creatable }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )
  const showCreateOption = creatable && search.trim() && !options.some(o => o.label.toLowerCase() === search.trim().toLowerCase())

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="searchable-select" ref={ref}>
      <button
        type="button"
        className="searchable-select-trigger"
        onClick={() => { setOpen(!open); setSearch('') }}
      >
        <span className={selected || value ? 'searchable-select-value' : 'searchable-select-placeholder'}>
          {selected ? selected.label : value || placeholder}
        </span>
        <span className="searchable-select-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="searchable-select-dropdown">
          <input
            className="searchable-select-search"
            type="text"
            placeholder={creatable ? 'Search or type new...' : 'Search...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="searchable-select-list">
            {showCreateOption && (
              <button
                type="button"
                className="searchable-select-option searchable-select-create"
                onClick={() => { onChange(search.trim()); setOpen(false); setSearch('') }}
              >
                + Create "<strong>{search.trim()}</strong>"
              </button>
            )}
            {filtered.length === 0 && !showCreateOption ? (
              <div className="searchable-select-empty">No items found</div>
            ) : (
              filtered.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  className={`searchable-select-option ${opt.value === value ? 'searchable-select-option-active' : ''}`}
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch('') }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AddStockForm({ onStockAdded }) {
  const [rows, setRows] = useState([{ ...EMPTY_ROW }])
  const [items, setItems] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchItems = useCallback(async () => {
    const { data } = await inventoryStockService.getItems()
    if (data) setItems(data)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const categories = [...new Set(items.map(i => i.item_category).filter(Boolean))].sort()
  const itemGroups = [...new Set(items.map(i => i.item_group).filter(Boolean))].sort()

  function updateRow(index, field, value) {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row
      const updated = { ...row, [field]: value }

      // When switching mode, reset fields
      if (field === 'mode') {
        updated.itemId = ''
        updated.name = ''
        updated.item_category = ''
        updated.item_group = ''
      }

      // When selecting existing item, auto-fill display info
      if (field === 'itemId' && value) {
        const item = items.find(it => it.id === value)
        if (item) {
          updated.name = item.name
          updated.item_category = item.item_category
          updated.item_group = item.item_group
        }
      }

      return updated
    }))
  }

  function addRow() {
    setRows(prev => [...prev, { ...EMPTY_ROW }])
  }

  function removeRow(index) {
    setRows(prev => prev.length === 1 ? [{ ...EMPTY_ROW }] : prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    // Validate
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.quantity || parseInt(row.quantity) <= 0) {
        setErrorMsg(`Row ${i + 1}: Enter a valid quantity`)
        return
      }
      if (row.mode === 'existing' && !row.itemId) {
        setErrorMsg(`Row ${i + 1}: Select an item`)
        return
      }
      if (row.mode === 'new' && !row.name.trim()) {
        setErrorMsg(`Row ${i + 1}: Enter an item name`)
        return
      }
    }

    setSubmitting(true)

    try {
      for (const row of rows) {
        let itemId = row.itemId

        if (row.mode === 'new') {
          const { data: newItem, error: createError } = await inventoryStockService.createItem({
            name: row.name.trim(),
            item_category: row.item_category.trim(),
            item_group: row.item_group.trim(),
          })
          if (createError || !newItem) {
            setErrorMsg(`Failed to create item "${row.name}": ${createError?.message || 'Unknown error'}`)
            setSubmitting(false)
            return
          }
          itemId = newItem.id
        }

        const { error: stockError } = await inventoryStockService.addStock(itemId, parseInt(row.quantity))
        if (stockError) {
          setErrorMsg(`Failed to add stock for "${row.name}": ${stockError.message}`)
          setSubmitting(false)
          return
        }
      }

      setSuccessMsg(`Successfully added ${rows.length} stock entr${rows.length === 1 ? 'y' : 'ies'}`)
      setRows([{ ...EMPTY_ROW }])
      fetchItems()
      if (onStockAdded) onStockAdded()
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="add-stock-form">
      <div className="add-stock-header">
        <h2 className="table-title">Add Stock</h2>
        <span className="results-count">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {successMsg && <div className="stock-success">{successMsg}</div>}
      {errorMsg && <div className="signin-error">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        {rows.map((row, index) => (
          <div className="stock-row" key={index}>
            <div className="stock-row-header">
              <span className="stock-row-number">#{index + 1}</span>
              {rows.length > 1 && (
                <button type="button" className="stock-row-remove" onClick={() => removeRow(index)}>✕</button>
              )}
            </div>

            <div className="stock-row-fields">
              <div className="stock-field stock-field-mode">
                <label className="stock-label">Type</label>
                <SearchableSelect
                  options={[
                    { value: 'existing', label: 'Existing Item' },
                    { value: 'new', label: 'New Item' },
                  ]}
                  value={row.mode}
                  onChange={val => updateRow(index, 'mode', val)}
                  placeholder="Select type"
                />
              </div>

              {row.mode === 'existing' ? (
                <div className="stock-field stock-field-item">
                  <label className="stock-label">Item</label>
                  <SearchableSelect
                    options={items.map(item => ({
                      value: item.id,
                      label: `${item.name} — ${item.item_category} / ${item.item_group}`,
                    }))}
                    value={row.itemId}
                    onChange={val => updateRow(index, 'itemId', val)}
                    placeholder="Search and select item..."
                  />
                </div>
              ) : (
                <>
                  <div className="stock-field stock-field-name">
                    <label className="stock-label">Item Name</label>
                    <input
                      className="stock-input"
                      type="text"
                      placeholder="Enter item name"
                      value={row.name}
                      onChange={e => updateRow(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="stock-field stock-field-category">
                    <label className="stock-label">Category</label>
                    <SearchableSelect
                      creatable
                      options={categories.map(c => ({ value: c, label: c }))}
                      value={row.item_category}
                      onChange={val => updateRow(index, 'item_category', val)}
                      placeholder="Select or create category"
                    />
                  </div>
                  <div className="stock-field stock-field-group">
                    <label className="stock-label">Brand / Group</label>
                    <SearchableSelect
                      creatable
                      options={itemGroups.map(g => ({ value: g, label: g }))}
                      value={row.item_group}
                      onChange={val => updateRow(index, 'item_group', val)}
                      placeholder="Select or create brand/group"
                    />
                  </div>
                </>
              )}

              <div className="stock-field stock-field-qty">
                <label className="stock-label">Quantity</label>
                <input
                  className="stock-input"
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={e => updateRow(index, 'quantity', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}

        <div className="stock-actions">
          <button type="button" className="btn-secondary" onClick={addRow}>+ Add Row</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Adding...' : `Add ${rows.length} Item${rows.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </form>
    </div>
  )
}
