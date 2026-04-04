'use client'

import { useState } from 'react'
import { Drawer, TextInput, Textarea, NumberInput, Button, Text, Group, Stack, ActionIcon, Box, Divider } from '@mantine/core'

export default function CartDrawer({ cartItems, isOpen, onToggle, onUpdateQty, onRemoveItem, onSubmitOrder }) {
  const [customerName, setCustomerName] = useState('')
  const [customerContact, setCustomerContact] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const totalItems = cartItems.reduce((sum, c) => sum + c.quantity, 0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!customerName.trim()) {
      alert('Customer name is required')
      return
    }
    setSubmitting(true)
    const success = await onSubmitOrder({
      customer_name: customerName.trim(),
      customer_contact: customerContact.trim(),
      notes: notes.trim(),
    })
    setSubmitting(false)
    if (success) {
      setCustomerName('')
      setCustomerContact('')
      setNotes('')
    }
  }

  return (
    <Drawer
      opened={isOpen}
      onClose={onToggle}
      title={`Cart (${cartItems.length} items, ${totalItems} units)`}
      position="right"
      size="sm"
      styles={{ title: { fontWeight: 700 } }}
    >
      {cartItems.length === 0 ? (
        <Text ta="center" c="dimmed" py="xl">Cart is empty. Add items from the inventory.</Text>
      ) : (
        <Stack gap="md">
          {cartItems.map(item => (
            <Group key={item.item_id} justify="space-between" wrap="nowrap">
              <Box style={{ minWidth: 0 }}>
                <Text fw={600} size="sm" truncate>{item.itemName}</Text>
                <Text size="xs" c="dimmed">{item.itemCategory}</Text>
              </Box>
              <Group gap="xs" wrap="nowrap">
                <NumberInput
                  size="xs"
                  w={65}
                  min={1}
                  max={item.maxAvailable}
                  value={item.quantity}
                  onChange={(val) => onUpdateQty(item.item_id, Math.max(1, Math.min(item.maxAvailable, val || 1)))}
                  styles={{ input: { textAlign: 'center' } }}
                />
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemoveItem(item.item_id)}>✕</ActionIcon>
              </Group>
            </Group>
          ))}

          <Divider />

          <form onSubmit={handleSubmit}>
            <Stack gap="sm">
              <TextInput
                label="Customer Name"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.currentTarget.value)}
                placeholder="Customer name"
              />
              <TextInput
                label="Contact"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.currentTarget.value)}
                placeholder="Phone or email"
              />
              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.currentTarget.value)}
                placeholder="Order notes (optional)"
                rows={2}
              />
              <Button type="submit" color="green" fullWidth loading={submitting} disabled={cartItems.length === 0}>
                {submitting ? 'Placing Order...' : `Place Order (${totalItems} units)`}
              </Button>
            </Stack>
          </form>
        </Stack>
      )}
    </Drawer>
  )
}
