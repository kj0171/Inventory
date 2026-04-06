'use client'

import { useState } from 'react'
import { Modal, Stack, Text, TextInput, Button, Group, Paper, Badge, Alert, ScrollArea } from '@mantine/core'
import { registerUnits } from '../shared/unitStore'

export default function BarcodeRegistrationModal({ opened, onClose, receiptItems }) {
  // receiptItems: [{ itemId, name, quantity }]
  // barcodes: { [itemId]: ['SN-001', 'SN-002', ...] }
  const [barcodes, setBarcodes] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleBarcodeChange(itemId, unitIndex, value) {
    setBarcodes(prev => {
      const arr = [...(prev[itemId] || [])]
      arr[unitIndex] = value
      return { ...prev, [itemId]: arr }
    })
  }

  function handleSave() {
    setError('')

    // Validate: check for duplicates across all items
    const allBarcodes = []
    for (const item of receiptItems) {
      const itemBarcodes = barcodes[item.itemId] || []
      for (let i = 0; i < item.quantity; i++) {
        const val = (itemBarcodes[i] || '').trim()
        if (!val) {
          setError(`${item.name}: Enter barcode for unit #${i + 1}`)
          return
        }
        if (allBarcodes.includes(val)) {
          setError(`Duplicate barcode "${val}" found`)
          return
        }
        allBarcodes.push(val)
      }
    }

    setSaving(true)
    // Register all units
    for (const item of receiptItems) {
      const itemBarcodes = (barcodes[item.itemId] || [])
        .slice(0, item.quantity)
        .map(b => b.trim())
      registerUnits(item.itemId, itemBarcodes)
    }

    setSaving(false)
    setBarcodes({})
    onClose()
  }

  function handleSkip() {
    setBarcodes({})
    onClose()
  }

  const totalUnits = (receiptItems || []).reduce((sum, i) => sum + i.quantity, 0)

  return (
    <Modal
      opened={opened}
      onClose={handleSkip}
      title={
        <Group gap="xs">
          <Text fw={600}>Register Barcodes</Text>
          <Badge size="sm" variant="light">{totalUnits} units</Badge>
        </Group>
      }
      size="lg"
      closeOnClickOutside={false}
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Enter serial numbers or scan barcodes for each unit. You can skip this and add later.
        </Text>

        {error && (
          <Alert color="red" variant="light" withCloseButton onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <ScrollArea.Autosize mah={400}>
          <Stack gap="md">
            {(receiptItems || []).map(item => (
              <Paper key={item.itemId} p="sm" withBorder radius="md">
                <Group gap="xs" mb="xs">
                  <Text fw={500} size="sm">{item.name}</Text>
                  <Badge size="xs" variant="light" color="blue">{item.quantity} units</Badge>
                </Group>
                <Stack gap="xs">
                  {Array.from({ length: item.quantity }, (_, i) => (
                    <TextInput
                      key={i}
                      size="xs"
                      placeholder={`Unit #${i + 1} — serial number or barcode`}
                      value={(barcodes[item.itemId] || [])[i] || ''}
                      onChange={e => handleBarcodeChange(item.itemId, i, e.currentTarget.value)}
                    />
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </ScrollArea.Autosize>

        <Group justify="space-between">
          <Button variant="subtle" color="gray" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Register All
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
