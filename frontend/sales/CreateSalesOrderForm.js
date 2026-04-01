'use client'

import { useState, useEffect, useCallback } from 'react'
import { inventoryStockService, customerService } from '../../backend'
import {
  Button, Card, Group, Stack, Title, Text, Select, TextInput,
  NumberInput, Modal, Alert, Divider, Badge, ActionIcon,
  SimpleGrid, Accordion, Table, Loader, Center
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

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
  const isMobile = useMediaQuery('(max-width: 768px)')

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
      })
      if (error) { setNewCustError(error.message); return }
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

  const itemSelectData = itemsWithStock.map(it => {
    const totalAvailable = it.stocks.reduce((sum, s) => sum + (s.quantity - (s.blocked_qty || 0)), 0)
    return {
      value: it.itemId,
      label: `${it.name} — ${it.category} / ${it.group} (${totalAvailable} avail)`,
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
                  nothingFoundMessage="No customers found"
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
            const selectedItem = itemsWithStock.find(it => it.itemId === row.itemId)
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

                {row.stockEntries.length > 0 && (
                  <Card withBorder radius="sm" padding="xs" mt="sm" bg="gray.0">
                    <Group justify="space-between" mb="xs">
                      <Text size="xs" fw={600} c="dimmed" tt="uppercase">Stock Batches</Text>
                      <Button
                        variant="subtle"
                        size="compact-xs"
                        onClick={() => toggleBatchSort(index)}
                      >
                        Date {row.sortAsc ? '↑' : '↓'}
                      </Button>
                    </Group>

                    {isMobile ? (
                      /* Mobile: stacked batch cards */
                      <Stack gap="xs">
                        {row.stockEntries.map((se, si) => (
                          <Card key={se.stockId} withBorder radius="sm" padding="xs">
                            <Group justify="space-between" mb={4}>
                              <Text size="xs" c="dimmed">{new Date(se.date).toLocaleDateString()}</Text>
                              <Badge size="sm" variant="light" color="teal">{se.available} avail</Badge>
                            </Group>
                            <NumberInput
                              placeholder="Qty to sell"
                              size="sm"
                              min={0}
                              max={se.available}
                              value={se.quantity === '' ? '' : Number(se.quantity)}
                              onChange={val => updateStockQty(index, si, val === '' ? '' : String(val))}
                            />
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      /* Desktop: table layout */
                      <Table verticalSpacing={4} horizontalSpacing="sm" fontSize="xs">
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Batch Date</Table.Th>
                            <Table.Th>Available</Table.Th>
                            <Table.Th w={120}>Qty to Sell</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {row.stockEntries.map((se, si) => (
                            <Table.Tr key={se.stockId}>
                              <Table.Td>{new Date(se.date).toLocaleDateString()}</Table.Td>
                              <Table.Td>
                                <Badge size="sm" variant="light" color="teal">{se.available} units</Badge>
                              </Table.Td>
                              <Table.Td>
                                <NumberInput
                                  size="xs"
                                  min={0}
                                  max={se.available}
                                  placeholder="0"
                                  value={se.quantity === '' ? '' : Number(se.quantity)}
                                  onChange={val => updateStockQty(index, si, val === '' ? '' : String(val))}
                                  styles={{ input: { width: 100 } }}
                                />
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Card>
                )}
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
