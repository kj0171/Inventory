'use client'

import { useState, useEffect, useCallback } from 'react'
import { inventoryItemService, customerService } from '../../backend'
import {
  Button, Card, Group, Stack, Text, Select, TextInput,
  NumberInput, Modal, Alert, Divider, Badge, ActionIcon,
  SimpleGrid
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

const EMPTY_ROW = { itemId: '', quantity: '', price: '' }

export default function CreateSalesOrderForm({ onOrderCreated }) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const [customers, setCustomers] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustForm, setNewCustForm] = useState({ name: '', mobile: '', email: '', gst_number: '', address: '' })
  const [newCustSubmitting, setNewCustSubmitting] = useState(false)
  const [newCustError, setNewCustError] = useState('')
  const [customersLoading, setCustomersLoading] = useState(true)
  const [rows, setRows] = useState([{ ...EMPTY_ROW }])
  const [itemsData, setItemsData] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const isMobile = useMediaQuery('(max-width: 768px)')

  const fetchItems = useCallback(async () => {
    const { data } = await inventoryItemService.getAll()
    if (data) setItemsData(data)
  }, [])

  const fetchCustomers = useCallback(async () => {
    setCustomersLoading(true)
    const { data } = await customerService.getAll()
    if (data) setCustomers(data)
    setCustomersLoading(false)
  }, [])

  useEffect(() => { fetchItems(); fetchCustomers() }, [fetchItems, fetchCustomers])

  function handleCustomerSelect(custId) {
    setSelectedCustomerId(custId)
    const cust = customers.find(c => c.id === custId)
    if (cust) {
      setCustomerName(cust.name)
      setCustomerPhone(cust.mobile || '')
      setCustomerEmail(cust.email || '')
      setCustomerAddress(cust.address || '')
    } else {
      setCustomerName('')
      setCustomerPhone('')
      setCustomerEmail('')
      setCustomerAddress('')
    }
  }

  async function handleCreateNewCustomer(e) {
    e.preventDefault()
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
        address: newCustForm.address.trim() || null,
      })
      if (error) { setNewCustError(error.message); return }
      setCustomers(prev => [...prev, data])
      setSelectedCustomerId(data.id)
      setCustomerName(data.name)
      setCustomerPhone(data.mobile || '')
      setCustomerEmail(data.email || '')
      setCustomerAddress(data.address || '')
      setShowNewCustomer(false)
      setNewCustForm({ name: '', mobile: '', email: '', gst_number: '', address: '' })
    } catch (err) {
      setNewCustError(err.message || 'Failed to create customer')
    } finally {
      setNewCustSubmitting(false)
    }
  }

  const availableItems = itemsData.filter(item => {
    const available = (item.quantity || 0) - (item.blocked_qty || 0)
    return available > 0
  })

  function selectItem(rowIndex, itemId) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row
      if (!itemId) return { ...EMPTY_ROW }
      return { itemId, quantity: '', price: '' }
    }))
  }

  function updateQty(rowIndex, value) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row
      return { ...row, quantity: value }
    }))
  }

  function updatePrice(rowIndex, value) {
    setRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row
      return { ...row, price: value }
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

    const allItems = []
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      if (!row.itemId) {
        setErrorMsg(`Row ${i + 1}: Select an item`)
        return
      }
      const qty = parseInt(row.quantity)
      if (!qty || qty <= 0) {
        setErrorMsg(`Row ${i + 1}: Enter a valid quantity`)
        return
      }
      const item = availableItems.find(it => it.id === row.itemId)
      const available = item ? (item.quantity || 0) - (item.blocked_qty || 0) : 0
      if (qty > available) {
        setErrorMsg(`Row ${i + 1}: Requested ${qty} but only ${available} available`)
        return
      }
      allItems.push({
        item_id: row.itemId,
        quantity: qty,
        price: parseFloat(row.price) || 0,
      })
    }

    setSubmitting(true)
    try {
      const success = await onOrderCreated({
        customer_id: selectedCustomerId,
        notes: customerEmail.trim(),
        items: allItems,
      })
      if (success) {
        setSuccessMsg('Sales order created successfully')
        setSelectedCustomerId('')
        setCustomerName('')
        setCustomerPhone('')
        setCustomerEmail('')
        setCustomerAddress('')
        setRows([{ ...EMPTY_ROW }])
        fetchItems()
      }
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const itemSelectData = availableItems.map(it => {
    const available = (it.quantity || 0) - (it.blocked_qty || 0)
    return {
      value: it.id,
      label: `${it.name} — ${it.item_category} / ${it.item_group} (${available} avail)`,
    }
  })

  const customerSelectData = customers.map(c => ({
    value: c.id,
    label: c.name,
  }))

  return (
    <Stack gap="lg">
      {successMsg && <Alert color="green" variant="light" withCloseButton onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" variant="light" withCloseButton onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

      <form onSubmit={handleSubmit}>
        <Stack gap="lg">
          {/* ── Customer Section ── */}
          <Card withBorder radius="md" padding="md">
            <Stack gap="sm">
              <Group gap="sm" align="flex-end" grow={!isMobile} wrap="wrap">
                <Select
                  label="Select Customer"
                  placeholder="Search customer..."
                  data={customerSelectData}
                  value={selectedCustomerId}
                  onChange={handleCustomerSelect}
                  searchable
                  clearable
                  nothingFoundMessage={customersLoading ? 'Loading customers…' : 'No customers found'}
                  style={{ flex: 1, minWidth: 200 }}
                  required
                />
                <Button variant="light" onClick={() => setShowNewCustomer(true)} mt={isMobile ? 0 : 24}>
                  + New Customer
                </Button>
              </Group>

              {selectedCustomerId && (
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput label="Phone" value={customerPhone} readOnly variant="filled" />
                  <TextInput label="Email" value={customerEmail} readOnly variant="filled" />
                </SimpleGrid>
              )}
              {selectedCustomerId && customerAddress && (
                <TextInput label="Address" value={customerAddress} readOnly variant="filled" />
              )}
            </Stack>
          </Card>

          {/* ── New Customer Modal ── */}
          <Modal opened={showNewCustomer} onClose={() => setShowNewCustomer(false)} title="New Customer" centered size="md">
            <form onSubmit={handleCreateNewCustomer}>
              <Stack gap="sm">
                {newCustError && <Alert color="red" variant="light">{newCustError}</Alert>}
                <TextInput
                  label="Name"
                  placeholder="Customer name"
                  value={newCustForm.name}
                  onChange={e => setNewCustForm(p => ({ ...p, name: e.target.value }))}
                  required
                  autoFocus
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                  <TextInput
                    label="Mobile"
                    placeholder="Mobile number"
                    type="tel"
                    value={newCustForm.mobile}
                    onChange={e => setNewCustForm(p => ({ ...p, mobile: e.target.value }))}
                    required
                  />
                  <TextInput
                    label="Email"
                    placeholder="Email (optional)"
                    type="email"
                    value={newCustForm.email}
                    onChange={e => setNewCustForm(p => ({ ...p, email: e.target.value }))}
                  />
                </SimpleGrid>
                <TextInput
                  label="GST Number"
                  placeholder="GST number (optional)"
                  value={newCustForm.gst_number}
                  onChange={e => setNewCustForm(p => ({ ...p, gst_number: e.target.value }))}
                />
                <TextInput
                  label="Address"
                  placeholder="Address (optional)"
                  value={newCustForm.address}
                  onChange={e => setNewCustForm(p => ({ ...p, address: e.target.value }))}
                />
                <Divider />
                <Group justify="flex-end">
                  <Button variant="default" onClick={() => setShowNewCustomer(false)}>Cancel</Button>
                  <Button type="submit" loading={newCustSubmitting}>Add Customer</Button>
                </Group>
              </Stack>
            </form>
          </Modal>

          {/* ── Item Rows ── */}
          {rows.map((row, index) => {
            const selectedItem = availableItems.find(it => it.id === row.itemId)
            const available = selectedItem ? (selectedItem.quantity || 0) - (selectedItem.blocked_qty || 0) : 0
            return (
              <Card key={index} withBorder radius="md" padding="md">
                <Group justify="space-between" mb="sm">
                  <Badge variant="light" color="blue" size="lg">Item #{index + 1}</Badge>
                  {rows.length > 1 && (
                    <ActionIcon variant="subtle" color="red" onClick={() => removeRow(index)} title="Remove item">
                      ✕
                    </ActionIcon>
                  )}
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
                  <Select
                    label="Select Item"
                    placeholder="Search and select item..."
                    data={itemSelectData}
                    value={row.itemId}
                    onChange={val => selectItem(index, val)}
                    searchable
                    clearable
                    nothingFoundMessage="No items found"
                    required
                  />
                  <NumberInput
                    label={`Quantity${selectedItem ? ` (${available} available)` : ''}`}
                    placeholder="Enter quantity"
                    min={1}
                    max={available || undefined}
                    value={row.quantity === '' ? '' : Number(row.quantity)}
                    onChange={val => updateQty(index, val === '' ? '' : String(val))}
                    disabled={!row.itemId}
                  />
                  <NumberInput
                    label="Price"
                    placeholder="Unit price"
                    min={0}
                    decimalScale={2}
                    prefix="₹"
                    value={row.price === '' ? '' : Number(row.price)}
                    onChange={val => updatePrice(index, val === '' ? '' : String(val))}
                    disabled={!row.itemId}
                  />
                </SimpleGrid>
              </Card>
            )
          })}

          {/* ── Actions ── */}
          <Group justify="space-between">
            <Button variant="light" onClick={addRow}>+ Add Item</Button>
            <Button type="submit" loading={submitting}>Create Order</Button>
          </Group>
        </Stack>
      </form>
    </Stack>
  )
}
