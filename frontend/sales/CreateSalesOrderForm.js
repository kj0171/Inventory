'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { inventoryStockService, customerService } from '../../backend'

function SearchableSelect({ options, value, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

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
        <span className={selected ? 'searchable-select-value' : 'searchable-select-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="searchable-select-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="searchable-select-dropdown">
          <input
            className="searchable-select-search"
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          <div className="searchable-select-list">
            {filtered.length === 0 ? (
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

const EMPTY_ROW = { itemId: '', stockEntries: [], sortAsc: false }

export default function CreateSalesOrderForm({ onOrderCreated }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustForm, setNewCustForm] = useState({ name: '', mobile: '', email: '', gst_number: '' })
  const [newCustSubmitting, setNewCustSubmitting] = useState(false)
  const [newCustError, setNewCustError] = useState('')
  const [rows, setRows] = useState([{ ...EMPTY_ROW }])
  const [stockData, setStockData] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchStock = useCallback(async () => {
    const { data } = await inventoryStockService.getAll()
    if (data) setStockData(data)
  }, [])

  const fetchCustomers = useCallback(async () => {
    const { data } = await customerService.getAll()
    if (data) setCustomers(data)
  }, [])

  useEffect(() => { fetchStock(); fetchCustomers() }, [fetchStock, fetchCustomers])

  function handleCustomerSelect(custId) {
    setSelectedCustomerId(custId)
    const cust = customers.find(c => c.id === custId)
    if (cust) {
      setCustomerName(cust.name)
      setCustomerPhone(cust.mobile || '')
      setCustomerEmail(cust.email || '')
    } else {
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
    }
  }

  async function handleCreateNewCustomer() {
    if (!newCustForm.name.trim() || !newCustForm.mobile.trim()) {
      setNewCustError('Name and mobile are required')
      return
    }
    setNewCustSubmitting(true)
    setNewCustError('')
    try {
      const { data, error } = await customerService.create({
        name: newCustForm.name.trim(),
        mobile: newCustForm.mobile.trim(),
        email: newCustForm.email.trim() || null,
        gst_number: newCustForm.gst_number.trim() || null,
      })
      if (error) { setNewCustError(error.message); return }
      // Add to list & select
      setCustomers(prev => [...prev, data])
      setSelectedCustomerId(data.id)
      setCustomerName(data.name)
      setCustomerPhone(data.mobile || '')
      setCustomerEmail(data.email || '')
      setShowNewCustomer(false)
      setNewCustForm({ name: '', mobile: '', email: '', gst_number: '' })
    } catch (err) {
      setNewCustError(err.message || 'Failed to create customer')
    } finally {
      setNewCustSubmitting(false)
    }
  }

  // Group stock by item_id, only items with at least one available stock row
  const itemsWithStock = (() => {
    const grouped = {}
    stockData.forEach(s => {
      const available = s.quantity - (s.blocked_qty || 0)
      if (available <= 0) return
      const key = s.item_id
      if (!grouped[key]) {
        grouped[key] = {
          itemId: key,
          name: s.inventory_items?.name || 'Unknown',
          category: s.inventory_items?.item_category || '',
          group: s.inventory_items?.item_group || '',
          stocks: [],
        }
      }
      grouped[key].stocks.push(s)
    })
    return Object.values(grouped)
  })()

  function selectItem(rowIndex, itemId) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row
      if (!itemId) return { ...EMPTY_ROW }
      const item = itemsWithStock.find(it => it.itemId === itemId)
      const stockEntries = (item?.stocks || [])
        .map(s => ({
          stockId: s.id,
          available: s.quantity - (s.blocked_qty || 0),
          date: s.created_at,
          quantity: '',
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date))
      return { itemId, stockEntries, sortAsc: false }
    }))
  }

  function updateStockQty(rowIndex, stockIndex, value) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row
      const stockEntries = row.stockEntries.map((se, si) => {
        if (si !== stockIndex) return se
        return { ...se, quantity: value }
      })
      return { ...row, stockEntries }
    }))
  }

  function toggleBatchSort(rowIndex) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row
      const newAsc = !row.sortAsc
      const sorted = [...row.stockEntries].sort((a, b) =>
        newAsc ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date)
      )
      return { ...row, stockEntries: sorted, sortAsc: newAsc }
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

    if (!selectedCustomerId) {
      setErrorMsg('Select a customer')
      return
    }

    // Collect all stock selections with qty > 0
    const allItems = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.itemId) {
        setErrorMsg(`Row ${i + 1}: Select an item`)
        return
      }
      const rowItems = row.stockEntries.filter(se => se.quantity && parseInt(se.quantity) > 0)
      if (rowItems.length === 0) {
        setErrorMsg(`Row ${i + 1}: Enter quantity for at least one stock batch`)
        return
      }
      for (const se of rowItems) {
        const qty = parseInt(se.quantity)
        if (qty > se.available) {
          setErrorMsg(`Row ${i + 1}: Requested ${qty} but only ${se.available} available for that batch`)
          return
        }
        allItems.push({
          inventory_stock_id: se.stockId,
          item_id: row.itemId,
          quantity: qty,
        })
      }
    }

    setSubmitting(true)

    try {
      const success = await onOrderCreated({
        customer_name: customerName.trim(),
        customer_contact: customerPhone.trim(),
        notes: customerEmail.trim(),
        items: allItems,
      })

      if (success) {
        setSuccessMsg('Sales order created successfully')
        setSelectedCustomerId('')
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setRows([{ ...EMPTY_ROW }])
        fetchStock()
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="add-stock-form">
      <div className="add-stock-header">
        <h2 className="table-title">Create Sales Order</h2>
        <span className="results-count">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
      </div>

      {successMsg && <div className="stock-success">{successMsg}</div>}
      {errorMsg && <div className="signin-error">{errorMsg}</div>}

      <form onSubmit={handleSubmit}>
        {/* Customer Selection */}
        <div className="customer-info-section">
          <div className="stock-field" style={{ gridColumn: '1 / -1' }}>
            <label className="stock-label">Select Customer *</label>
            <div className="customer-select-row">
              <SearchableSelect
                options={customers.map(c => ({
                  value: c.id,
                  label: c.name,
                }))}                value={selectedCustomerId}
                onChange={handleCustomerSelect}
                placeholder="Search customer..."
              />
              <button type="button" className="btn-secondary btn-sm" onClick={() => setShowNewCustomer(true)}>
                + New
              </button>
            </div>
          </div>
          {selectedCustomerId && (
            <>
              <div className="stock-field">
                <label className="stock-label">Phone</label>
                <input className="stock-input" type="tel" value={customerPhone} readOnly />
              </div>
              <div className="stock-field">
                <label className="stock-label">Email</label>
                <input className="stock-input" type="email" value={customerEmail} readOnly />
              </div>
            </>
          )}
        </div>

        {/* Inline New Customer Modal */}
        {showNewCustomer && (
          <div className="modal-overlay" onClick={() => setShowNewCustomer(false)}>
            <div className="team-modal" onClick={e => e.stopPropagation()}>
              <div className="team-modal-header">
                <h3>New Customer</h3>
                <button type="button" className="modal-close-btn" onClick={() => setShowNewCustomer(false)}>✕</button>
              </div>
              <div className="team-form">
                {newCustError && <div className="signin-error">{newCustError}</div>}
                <div className="signin-field">
                  <label className="signin-label">Name *</label>
                  <input className="signin-input" type="text" placeholder="Customer name" value={newCustForm.name}
                    onChange={e => setNewCustForm(p => ({ ...p, name: e.target.value }))} autoFocus />
                </div>
                <div className="signin-field">
                  <label className="signin-label">Mobile *</label>
                  <input className="signin-input" type="tel" placeholder="Mobile number" value={newCustForm.mobile}
                    onChange={e => setNewCustForm(p => ({ ...p, mobile: e.target.value }))} />
                </div>
                <div className="signin-field">
                  <label className="signin-label">Email</label>
                  <input className="signin-input" type="email" placeholder="Email (optional)" value={newCustForm.email}
                    onChange={e => setNewCustForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="signin-field">
                  <label className="signin-label">GST Number</label>
                  <input className="signin-input" type="text" placeholder="GST number (optional)" value={newCustForm.gst_number}
                    onChange={e => setNewCustForm(p => ({ ...p, gst_number: e.target.value }))} />
                </div>
                <div className="team-form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowNewCustomer(false)}>Cancel</button>
                  <button type="button" className="btn-primary" disabled={newCustSubmitting} onClick={handleCreateNewCustomer}>
                    {newCustSubmitting ? 'Creating...' : 'Add Customer'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Item Rows */}
        {rows.map((row, index) => (
          <div className="stock-row" key={index}>
            <div className="stock-row-header">
              <span className="stock-row-number">#{index + 1}</span>
              {rows.length > 1 && (
                <button type="button" className="stock-row-remove" onClick={() => removeRow(index)}>✕</button>
              )}
            </div>

            <div className="stock-field" style={{ marginBottom: row.stockEntries.length > 0 ? 12 : 0 }}>
              <label className="stock-label">Item</label>
              <SearchableSelect
                options={itemsWithStock.map(it => {
                  const totalAvailable = it.stocks.reduce((sum, s) => sum + (s.quantity - (s.blocked_qty || 0)), 0)
                  return {
                    value: it.itemId,
                    label: `${it.name} — ${it.category} / ${it.group} (${totalAvailable} available)`,
                  }
                })}
                value={row.itemId}
                onChange={val => selectItem(index, val)}
                placeholder="Search and select item..."
              />
            </div>

            {row.stockEntries.length > 0 && (
              <div className="sales-stock-batches">
                <div className="sales-batch-header">
                  <span className="sales-batch-sort" onClick={() => toggleBatchSort(index)}>
                    Stock Batch {row.sortAsc ? '▲' : '▼'}
                  </span>
                  <span>Available</span>
                  <span>Qty to Sell</span>
                </div>
                {row.stockEntries.map((se, si) => (
                  <div className="sales-batch-row" key={se.stockId}>
                    <span className="sales-batch-date">
                      {new Date(se.date).toLocaleDateString()}
                    </span>
                    <span className="sales-batch-available">
                      {se.available} units
                    </span>
                    <input
                      className="stock-input sales-batch-qty"
                      type="number"
                      min="0"
                      max={se.available}
                      placeholder="0"
                      value={se.quantity}
                      onChange={e => updateStockQty(index, si, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="stock-actions">
          <button type="button" className="btn-secondary" onClick={addRow}>+ Add Item</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
