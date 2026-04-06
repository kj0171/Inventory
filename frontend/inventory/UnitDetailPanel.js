'use client'

import { useState, useEffect } from 'react'
import { Drawer, Group, Text, Badge, Table, Stack, Divider } from '@mantine/core'
import { getUnitsForItem, registerUnits } from '../shared/unitStore'
import ScannerInput from '../shared/ScannerInput'

const STATUS_COLOR = { available: 'green', dispatched: 'blue' }

// Module-level event bus — fire from anywhere, drawer picks it up
const _listeners = new Set()
export function openUnitDrawer(item) {
  _listeners.forEach(fn => fn(item))
}

export default function UnitDetailPanel() {
  const [item, setItem] = useState(null)
  const [units, setUnits] = useState([])
  const [regKey, setRegKey] = useState(0)

  useEffect(() => {
    const handler = (i) => {
      setItem(i)
      setRegKey(0)
    }
    _listeners.add(handler)
    return () => _listeners.delete(handler)
  }, [])

  // Refresh units whenever item changes or after registration
  useEffect(() => {
    if (item) setUnits(getUnitsForItem(item.id))
    else setUnits([])
  }, [item, regKey])

  const availableCount = units.filter(u => u.status === 'available').length
  const dispatchedCount = units.filter(u => u.status === 'dispatched').length
  const unregistered = item ? Math.max(0, (item.quantity || 0) - units.length) : 0

  function handleRegister(barcodes) {
    registerUnits(item.id, barcodes)
    setRegKey(prev => prev + 1)
  }

  return (
    <Drawer opened={!!item} onClose={() => setItem(null)} title={item?.name || 'Units'} position="right" size="md">
      <Group gap="xs" mb="md">
        <Badge color="green" variant="light" size="sm">{availableCount} available</Badge>
        <Badge color="blue" variant="light" size="sm">{dispatchedCount} dispatched</Badge>
        <Badge variant="light" size="sm">{units.length} registered</Badge>
        {unregistered > 0 && (
          <Badge color="orange" variant="light" size="sm">{unregistered} unregistered</Badge>
        )}
      </Group>

      {units.length === 0 ? (
        <Text ta="center" c="dimmed" py="lg">No units registered for this item yet.</Text>
      ) : (
        <Table striped highlightOnHover verticalSpacing="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Serial / Barcode</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Registered On</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {units.map(u => (
              <Table.Tr key={u.id}>
                <Table.Td><Text size="sm" fw={500}>{u.serial_number}</Text></Table.Td>
                <Table.Td><Badge size="xs" color={STATUS_COLOR[u.status]}>{u.status}</Badge></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{new Date(u.created_at).toLocaleDateString()}</Text></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <Divider my="md" />

      {unregistered > 0 && (
        <ScannerInput
          remaining={unregistered}
          registered={units.length}
          onRegister={handleRegister}
        />
      )}

      {unregistered === 0 && units.length > 0 && (
        <Text ta="center" size="sm" c="green" fw={500}>All units registered</Text>
      )}
    </Drawer>
  )
}
