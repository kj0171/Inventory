'use client'

import { useState, useEffect, useCallback } from 'react'
import { Select, TextInput, NumberInput, Button, Paper, Group, Text, Stack, Alert, ActionIcon, Badge, SimpleGrid, Box, Textarea, Autocomplete } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { inventoryItemService, supplierService, purchaseOrderService } from '../../backend'

const EMPTY_ROW = { mode: 'existing', itemId: '', name: '', item_category: '', item_group: '', quantity: '', price: '', searchText: '' }

export default function AddStockForm({ onStockAdded }) {
  const [rows, setRows] = useState([{ ...EMPTY_ROW }])
  const [items, setItems] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const fetchItems = useCallback(async () => {
    const { data } = await inventoryItemService.getAll()
    if (data) setItems(data)
  }, [])

  const fetchSuppliers = useCallback(async () => {
    setSuppliersLoading(true)
    const { data } = await supplierService.getAll()
    if (data) setSuppliers(data)
    setSuppliersLoading(false)
  }, [])

  useEffect(() => { fetchItems(); fetchSuppliers() }, [fetchItems, fetchSuppliers])

  const categories = [...new Set(items.map(i => i.item_category).filter(Boolean))].sort()
  const itemGroups = [...new Set(items.map(i => i.item_group).filter(Boolean))].sort()

  function updateRow(index, field, value) {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row
      const updated = { ...row, [field]: value }

      if (field === 'mode') {
        updated.itemId = ''
        updated.name = ''
        updated.item_category = ''
        updated.item_group = ''
      }

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

    if (!selectedSupplierId) {
      setErrorMsg('Select a supplier')
      return
    }

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
      const resolvedItems = []

      for (const row of rows) {
        let itemId = row.itemId

        if (row.mode === 'new') {
          const { data: newItem, error: createError } = await inventoryItemService.createItem({
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

        resolvedItems.push({
          inventory_id: itemId,
          quantity: parseInt(row.quantity),
          price: parseFloat(row.price) || 0,
        })
      }

      // Create PO
      const { data: po, error: poError } = await purchaseOrderService.create({
        supplier_id: selectedSupplierId,
        notes: notes.trim() || null,
        items: resolvedItems,
      })
      if (poError || !po) {
        setErrorMsg(`Failed to create purchase order: ${poError?.message || 'Unknown error'}`)
        setSubmitting(false)
        return
      }

      // Add stock quantities
      for (const item of resolvedItems) {
        const { error: addError } = await inventoryItemService.addQuantity(item.inventory_id, item.quantity)
        if (addError) {
          setErrorMsg(`Failed to add stock: ${addError.message}`)
          setSubmitting(false)
          return
        }
      }

      setSuccessMsg(`Successfully added ${rows.length} stock entr${rows.length === 1 ? 'y' : 'ies'}`)
      setRows([{ ...EMPTY_ROW }])
      setSelectedSupplierId('')
      setNotes('')
      fetchItems()
      if (onStockAdded) onStockAdded()
    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack gap="md">
      <Group gap="xs">
        <Text fw={600} size="lg">Add Stock</Text>
        <Text size="sm" c="dimmed">{rows.length} item{rows.length !== 1 ? 's' : ''}</Text>
      </Group>

      {successMsg && <Alert color="green" variant="light" withCloseButton onClose={() => setSuccessMsg('')}>{successMsg}</Alert>}
      {errorMsg && <Alert color="red" variant="light" withCloseButton onClose={() => setErrorMsg('')}>{errorMsg}</Alert>}

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {/* Supplier selection */}
          <Paper shadow="xs" radius="md" p="md" withBorder>
            <Stack gap="sm">
              <Text fw={600} size="sm">Supplier</Text>
              <Select
                placeholder={suppliersLoading ? 'Loading suppliers…' : 'Select supplier'}
                data={suppliers.map(s => ({
                  value: s.id,
                  label: s.firm_name ? `${s.name} — ${s.firm_name}` : s.name,
                }))}
                value={selectedSupplierId}
                onChange={setSelectedSupplierId}
                searchable
                clearable
                disabled={suppliersLoading}
              />
              {selectedSupplierId && (() => {
                const sup = suppliers.find(s => s.id === selectedSupplierId)
                return sup ? (
                  <Group gap="lg">
                    {sup.mobile && <Text size="sm" c="dimmed">Phone: {sup.mobile}</Text>}
                    {sup.email && <Text size="sm" c="dimmed">Email: {sup.email}</Text>}
                    {sup.gst_number && <Text size="sm" c="dimmed">GST: {sup.gst_number}</Text>}
                  </Group>
                ) : null
              })()}
            </Stack>
          </Paper>

          {rows.map((row, index) => (
            <Paper key={index} shadow="xs" radius="md" p="md" withBorder>
              <Group justify="space-between" mb="sm">
                <Badge variant="light" color="blue" size="sm">#{index + 1}</Badge>
                {rows.length > 1 && (
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeRow(index)}>✕</ActionIcon>
                )}
              </Group>

              <SimpleGrid cols={{ base: 1, sm: row.mode === 'new' ? 6 : 4 }} spacing="sm">
                <Select
                  label="Type"
                  size="sm"
                  data={[
                    { value: 'existing', label: 'Existing Item' },
                    { value: 'new', label: 'New Item' },
                  ]}
                  value={row.mode}
                  onChange={val => updateRow(index, 'mode', val)}
                />

                {row.mode === 'existing' ? (
                  <Select
                    label="Item"
                    size="sm"
                    searchable
                    data={items.map(item => ({
                      value: item.id,
                      label: `${item.name} — ${item.item_category} / ${item.item_group}`,
                    }))}
                    value={row.itemId}
                    onChange={val => updateRow(index, 'itemId', val)}
                    placeholder="Search and select item..."
                    nothingFoundMessage="No items found"
                  />
                ) : (
                  <>
                    <TextInput
                      label="Item Name"
                      size="sm"
                      placeholder="Enter item name"
                      value={row.name}
                      onChange={e => updateRow(index, 'name', e.currentTarget.value)}
                    />
                    <Autocomplete
                      label="Category"
                      size="sm"
                      data={categories}
                      value={row.item_category}
                      onChange={val => updateRow(index, 'item_category', val)}
                      placeholder="Type or select"
                    />
                    <Autocomplete
                      label="Brand"
                      size="sm"
                      data={itemGroups}
                      value={row.item_group}
                      onChange={val => updateRow(index, 'item_group', val)}
                      placeholder="Type or select"
                    />
                  </>
                )}

                <NumberInput
                  label="Quantity"
                  size="sm"
                  min={1}
                  placeholder="Qty"
                  value={row.quantity === '' ? '' : Number(row.quantity)}
                  onChange={val => updateRow(index, 'quantity', val)}
                />
                <NumberInput
                  label="Price"
                  size="sm"
                  min={0}
                  decimalScale={2}
                  prefix="₹"
                  placeholder="Unit price"
                  value={row.price === '' ? '' : Number(row.price)}
                  onChange={val => updateRow(index, 'price', val)}
                />
              </SimpleGrid>
            </Paper>
          ))}

          <Group justify="space-between">
            <Button variant="default" onClick={addRow}>+ Add Row</Button>
            <Button type="submit" loading={submitting}>
              {submitting ? 'Adding...' : `Add ${rows.length} Item${rows.length !== 1 ? 's' : ''}`}
            </Button>
          </Group>

          <Textarea
            label="Notes (optional)"
            placeholder="Any notes for this purchase…"
            value={notes}
            onChange={(e) => setNotes(e.currentTarget.value)}
            autosize
            minRows={2}
          />
        </Stack>
      </form>
    </Stack>
  )
}
