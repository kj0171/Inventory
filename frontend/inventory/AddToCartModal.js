'use client'

import { useState } from 'react'
import { Modal, NumberInput, Text, Group, Badge, Button, Alert, Stack } from '@mantine/core'

export default function AddToCartModal({ item, currentCartQty, onClose, onAdd }) {
  const available = item.quantity - (item.blocked_qty || 0)
  const [quantity, setQuantity] = useState(currentCartQty || 1)

  function handleSubmit(e) {
    e.preventDefault()
    const qty = Number(quantity)
    if (!qty || qty <= 0 || qty > available) return
    onAdd(item, qty)
    onClose()
  }

  return (
    <Modal opened onClose={onClose} title="Add to Cart" centered>
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <div style={{ background: '#f8f9fa', borderRadius: 10, padding: 16 }}>
            <Text fw={600} size="lg" mb={8}>{item.inventory_items?.name || 'Unknown Item'}</Text>
            <Group gap="md">
              <Badge variant="light" color="gray">{item.inventory_items?.item_category}</Badge>
              <Text size="sm" c="dimmed">Stock: {item.quantity}</Text>
              <Text size="sm" c="dimmed">Available: {available}</Text>
            </Group>
          </div>

          {currentCartQty > 0 && (
            <Alert color="green" variant="light">Already in cart: {currentCartQty} units</Alert>
          )}

          <NumberInput
            label="Quantity"
            min={1}
            max={available}
            value={quantity}
            onChange={setQuantity}
            placeholder={`Max: ${available}`}
            autoFocus
          />

          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!quantity || quantity <= 0 || quantity > available}>
              {currentCartQty > 0 ? 'Update Cart' : 'Add to Cart'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
