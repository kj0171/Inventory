'use client'

import { useState, useEffect, useCallback } from 'react'
import { customerService } from '../../backend'

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', mobile: '', email: '', gst_number: '' })

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await customerService.getAll()
    if (!error && data) setCustomers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  function openAdd() {
    setEditingCustomer(null)
    setForm({ name: '', mobile: '', email: '', gst_number: '' })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(customer) {
    setEditingCustomer(customer)
    setForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      gst_number: customer.gst_number || '',
    })
    setFormError('')
    setShowForm(true)
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.mobile.trim()) {
      setFormError('Name and mobile are required')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      if (editingCustomer) {
        const { error } = await customerService.update(editingCustomer.id, {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          gst_number: form.gst_number.trim() || null,
        })
        if (error) { setFormError(error.message); return }
      } else {
        const { error } = await customerService.create({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          gst_number: form.gst_number.trim() || null,
        })
        if (error) { setFormError(error.message); return }
      }

      setShowForm(false)
      setEditingCustomer(null)
      fetchCustomers()
    } catch (err) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this customer?')) return
    const { error } = await customerService.remove(id)
    if (error) {
      alert('Failed to remove: ' + error.message)
      return
    }
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="team-management">
      <div className="team-header">
        <div>
          <h2 className="table-title">Customers</h2>
          <span className="results-count">{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Add Customer</button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="team-modal" onClick={e => e.stopPropagation()}>
            <div className="team-modal-header">
              <h3>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</h3>
              <button className="modal-close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="team-form" onSubmit={handleSubmit}>
              {formError && <div className="signin-error">{formError}</div>}
              <div className="signin-field">
                <label className="signin-label" htmlFor="cust-name">Name *</label>
                <input
                  id="cust-name"
                  className="signin-input"
                  type="text"
                  placeholder="Customer name"
                  value={form.name}
                  onChange={e => handleChange('name', e.target.value)}
                  autoFocus
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="cust-mobile">Mobile *</label>
                <input
                  id="cust-mobile"
                  className="signin-input"
                  type="tel"
                  placeholder="Mobile number"
                  value={form.mobile}
                  onChange={e => handleChange('mobile', e.target.value)}
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="cust-email">Email</label>
                <input
                  id="cust-email"
                  className="signin-input"
                  type="email"
                  placeholder="Email (optional)"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="cust-gst">GST Number</label>
                <input
                  id="cust-gst"
                  className="signin-input"
                  type="text"
                  placeholder="GST number (optional)"
                  value={form.gst_number}
                  onChange={e => handleChange('gst_number', e.target.value)}
                />
              </div>
              <div className="team-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingCustomer ? 'Update' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="team-empty"><p>Loading...</p></div>
      ) : customers.length === 0 ? (
        <div className="team-empty">
          <p>No customers added yet. Click &quot;Add Customer&quot; to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile</th>
                <th>Email</th>
                <th>GST Number</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(cust => (
                <tr key={cust.id}>
                  <td data-label="Name"><strong>{cust.name}</strong></td>
                  <td data-label="Mobile">{cust.mobile || '—'}</td>
                  <td data-label="Email">{cust.email || '—'}</td>
                  <td data-label="GST">{cust.gst_number || '—'}</td>
                  <td data-label="Actions">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => openEdit(cust)}>Edit</button>
                      <button className="btn-remove" onClick={() => handleRemove(cust.id)}>Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
