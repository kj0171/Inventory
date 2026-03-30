'use client'

import { useState, useEffect, useCallback } from 'react'
import { ROLES, useAuth } from '../shared/auth'
import { userService } from '../../backend'

const ROLE_OPTIONS = [
  { value: ROLES.SALESPERSON, label: 'Sales' },
  { value: ROLES.DISPATCHER, label: 'Dispatch' },
  { value: ROLES.ADMIN, label: 'Admin' },
]

export default function TeamManagement() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', role: ROLES.SALESPERSON })

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const { data, error } = await userService.getAll()
    if (!error && data) setEmployees(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return

    setSubmitting(true)
    setFormError('')

    try {
      const { data, error } = await userService.createUser({
        email: form.email.trim(),
        password: form.password.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      }, user)

      if (error) {
        setFormError(error.message)
        return
      }

      setForm({ full_name: '', email: '', password: '', phone: '', role: ROLES.SALESPERSON })
      setShowForm(false)
      fetchEmployees()
    } catch (err) {
      setFormError(err.message || 'Failed to add employee')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    const { error } = await userService.deleteUser(id)
    if (error) {
      alert('Failed to remove: ' + error.message)
      return
    }
    setEmployees(prev => prev.filter(emp => emp.id !== id))
  }

  function getRoleBadgeClass(role) {
    if (role === ROLES.ADMIN) return 'role-badge role-admin'
    if (role === ROLES.SALESPERSON) return 'role-badge role-sales'
    if (role === ROLES.DISPATCHER) return 'role-badge role-dispatch'
    return 'role-badge'
  }

  return (
    <div className="team-management">
      <div className="team-header">
        <div>
          <h2 className="table-title">Team Members</h2>
          <span className="results-count">{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
        </div>
{user?.profile?.role === ROLES.ADMIN && (
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Add Employee
        </button>
        )}
      </div>

      {/* Add Employee Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="team-modal" onClick={e => e.stopPropagation()}>
            <div className="team-modal-header">
              <h3>Add New Employee</h3>
              <button className="modal-close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="team-form" onSubmit={handleAdd}>
              {formError && <div className="signin-error">{formError}</div>}
              <div className="signin-field">
                <label className="signin-label" htmlFor="emp-name">Full Name</label>
                <input
                  id="emp-name"
                  className="signin-input"
                  type="text"
                  placeholder="Enter full name"
                  value={form.full_name}
                  onChange={e => handleChange('full_name', e.target.value)}
                  autoFocus
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="emp-email">Email</label>
                <input
                  id="emp-email"
                  className="signin-input"
                  type="email"
                  placeholder="Enter email"
                  value={form.email}
                  onChange={e => handleChange('email', e.target.value)}
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="emp-password">Password</label>
                <input
                  id="emp-password"
                  className="signin-input"
                  type="password"
                  placeholder="Set initial password"
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="emp-phone">Phone</label>
                <input
                  id="emp-phone"
                  className="signin-input"
                  type="tel"
                  placeholder="Enter phone number (optional)"
                  value={form.phone}
                  onChange={e => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="signin-field">
                <label className="signin-label" htmlFor="emp-role">Role</label>
                <select
                  id="emp-role"
                  className="signin-input"
                  value={form.role}
                  onChange={e => handleChange('role', e.target.value)}
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="team-form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee List */}
      {loading ? (
        <div className="team-empty"><p>Loading...</p></div>
      ) : employees.length === 0 ? (
        <div className="team-empty">
          <p>No employees added yet. Click "Add Employee" to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Role</th>
                {user?.profile?.role === ROLES.ADMIN && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td><strong>{emp.full_name}</strong></td>
                  <td>{emp.phone || '—'}</td>
                  <td><span className={getRoleBadgeClass(emp.role)}>{emp.role}</span></td>
                  {user?.profile?.role === ROLES.ADMIN && (
                  <td>
                    <button className="btn-remove" onClick={() => handleRemove(emp.id)}>Remove</button>
                  </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
