'use client'

import { useState } from 'react'
import {
  Modal, NumberInput, TextInput, Textarea, Alert, Button,
  Group, Badge, Card, Text, Stack
} from '@mantine/core'
import { salesOrderService, inventoryStockService } from '../../backend'

export default function CreateSaleModal({ item, onClose, onSubmit }) {
  const [quantity, setQuantity] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const available = item.quantity - (item.blocked_qty || 0)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const qty = Number(quantity)
    if (!quantity || isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity greater than 0')
      return
    }
    if (qty > available) {
      setError(`Quantity cannot exceed available stock (${available})`)
      return
    }
    if (!customerName.trim()) {
      setError('Customer name is required')
      return
    }

    setSubmitting(true)

    const { data: order, error: createError } = await salesOrderService.create({
      inventory_stock_id: item.id,
      item_id: item.item_id,
      quantity: qty,
      customer_name: customerName.trim(),
      customer_contact: customerContact.trim(),
      notes: notes.trim(),
    })

    if (createError || !order) {
      setError('Failed to create sale order. Please try again.')
      console.error('Create sale error:', createError)
      setSubmitting(false)
      return
    }

    const newBlocked = (item.blocked_qty || 0) + qty
    await inventoryStockService.updateBlockedQty(item.id, newBlocked, item.item_id)

    setSubmitting(false)
    onSubmit(order)
  }

  return (
    <Modal opened onClose={onClose} title="Create Sale Order" size="md" centered>
      <Stack gap="md">
        <Card padding="sm" radius="sm" withBorder bg="gray.0">
          <Text fw={600}>{item.inventory_items?.name || 'Unknown Item'}</Text>
          <Group gap="md" mt={4}>
            <Badge variant="light" color="gray">{item.inventory_items?.item_category}</Badge>
            <Text size="sm" c="dimmed">Stock: {item.quantity}</Text>
            <Text size="sm" c="dimmed">Available: {available}</Text>
          </Group>
        </Card>

        <form onSubmit={handleSubmit}>
          <Stack gap="sm">
            <NumberInput
              label="Quantity"
              required
              min={1}
              max={available}
              value={quantity}
              onChange={(val) => { setQuantity(val); setError('') }}
              placeholder={`Max: ${available}`}
              autoFocus
            />
            <TextInput
              label="Customer Name"
              required
              value={customerName}
              onChange={(e) => { setCustomerName(e.currentTarget.value); setError('') }}
              placeholder="Enter customer name"
            />
            <TextInput
              label="Customer Contact"
              value={customerContact}
              onChange={(e) => setCustomerContact(e.currentTarget.value)}
              placeholder="Email or phone"
            />
            <Textarea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
              placeholder="Optional notes..."
              rows={3}
            />

            {error && <Alert color="red" variant="light">{error}</Alert>}

            <Group justify="flex-end" mt="xs">
              <Button variant="default" onClick={onClose} disabled={submitting}>Cancel</Button>
              <Button type="submit" loading={submitting}>Create Sale Order</Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Modal>
  )
}
