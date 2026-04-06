'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  Badge, Button, Card, Center, Collapse, Group,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useStockReceipts, markReceiptComplete } from '../shared/stockReceipts'
import { getRegisteredCount, registerUnits } from '../shared/unitStore'
import { formatDate } from '../shared/utils'
import ScannerInput from '../shared/ScannerInput'
import { useAuth, ROLES } from '../shared/auth'

const STATUS_COLOR = { pending: 'orange', partial: 'yellow', complete: 'green' }

function getReceiptStatus(receipt) {
  if (receipt.status === 'completed') return 'complete'
  const totalQty = receipt.items.reduce((s, i) => s + i.quantity, 0)
  const totalReg = receipt.items.reduce((s, i) => s + getRegisteredCount(i.itemId), 0)
  if (totalReg >= totalQty) return 'complete'
  if (totalReg > 0) return 'partial'
  return 'pending'
}

export default function ReceiptBarcodeRegistration() {
  const receipts = useStockReceipts()
  const { user } = useAuth()
  const isAdmin = user?.profile?.role === ROLES.ADMIN
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  const isMobile = useMediaQuery('(max-width: 768px)')

  function toggleExpand(id) {
    setExpandedOrders(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => {
      const status = getReceiptStatus(r)
      if (statusFilter !== 'all' && status !== statusFilter) return false
      if (searchFilter) {
        const s = searchFilter.toLowerCase()
        const matchesItem = r.items.some(i =>
          i.name?.toLowerCase().includes(s) || i.category?.toLowerCase().includes(s) || i.brand?.toLowerCase().includes(s)
        )
        const matchesId = r.id.toLowerCase().includes(s)
        if (!matchesItem && !matchesId) return false
      }
      if (dateFrom) {
        if (new Date(r.createdAt) < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(r.createdAt) > to) return false
      }
      return true
    })
  }, [receipts, statusFilter, searchFilter, dateFrom, dateTo])

  const stats = useMemo(() => ({
    total: receipts.length,
    pending: receipts.filter(r => getReceiptStatus(r) === 'pending').length,
    partial: receipts.filter(r => getReceiptStatus(r) === 'partial').length,
    complete: receipts.filter(r => getReceiptStatus(r) === 'complete').length,
  }), [receipts])

  const statCards = [
    { label: 'All POs', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Pending', value: stats.pending, color: 'orange', filter: 'pending' },
    { label: 'Partial', value: stats.partial, color: 'yellow', filter: 'partial' },
    { label: 'Complete', value: stats.complete, color: 'green', filter: 'complete' },
  ]

  function getTotalQty(items) {
    return items.reduce((s, i) => s + i.quantity, 0)
  }

  function getTotalRegistered(items) {
    return items.reduce((s, i) => s + getRegisteredCount(i.itemId), 0)
  }

  function renderItemsSummary(items) {
    if (!items || items.length === 0) return 'No items'
    if (items.length === 1) return items[0].name || 'Unknown'
    return `${items[0].name || 'Unknown'} +${items.length - 1} more`
  }

  return (
    <Stack gap="md">
      {/* Stat cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {statCards.map(s => (
          <Paper
            key={s.filter}
            p="md"
            radius="md"
            withBorder
            style={{
              cursor: 'pointer',
              borderColor: statusFilter === s.filter ? `var(--mantine-color-${s.color}-6)` : undefined,
              backgroundColor: statusFilter === s.filter ? `var(--mantine-color-${s.color}-0)` : undefined,
            }}
            onClick={() => setStatusFilter(s.filter)}
          >
            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{s.label}</Text>
            <Text size="xl" fw={700} c={s.color}>{s.value}</Text>
          </Paper>
        ))}
      </SimpleGrid>

      {/* Filters — single row */}
      <Group gap="sm">
        <TextInput
          size="sm"
          placeholder="Search items, category, PO ID…"
          value={searchFilter}
          onChange={e => setSearchFilter(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <TextInput size="sm" type="date" placeholder="From" value={dateFrom} onChange={e => setDateFrom(e.currentTarget.value)} w={140} />
        <TextInput size="sm" type="date" placeholder="To" value={dateTo} onChange={e => setDateTo(e.currentTarget.value)} w={140} />
        {(dateFrom || dateTo || searchFilter) && (
          <Button variant="subtle" color="gray" size="sm" onClick={() => { setSearchFilter(''); setDateFrom(''); setDateTo('') }}>Clear</Button>
        )}
      </Group>

      {/* PO List */}
      <Paper p="md" radius="md" withBorder>
        {filteredReceipts.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Text fw={500} size="lg">No purchase orders found</Text>
              <Text c="dimmed" size="sm">{receipts.length === 0 ? 'Admin needs to add stock first.' : 'Try adjusting the filters.'}</Text>
            </Stack>
          </Center>
        ) : isMobile ? (
          <Stack gap="sm">
            {filteredReceipts.map(receipt => {
              const items = receipt.items
              const status = getReceiptStatus(receipt)
              const isExpanded = expandedOrders[receipt.id]
              return (
                <Card key={receipt.id} padding="sm" radius="md" withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(receipt.id)}
                >
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={600} size="sm">PO #{receipt.id.slice(-6)}</Text>
                      <Text size="xs" c="dimmed">{formatDate(receipt.createdAt)}</Text>
                    </div>
                    <Badge color={STATUS_COLOR[status]}>{status}</Badge>
                  </Group>

                  {isAdmin && status !== 'complete' && (
                    <Button size="xs" variant="light" color="green" fullWidth mb="xs" onClick={e => { e.stopPropagation(); markReceiptComplete(receipt.id) }}>Mark Complete</Button>
                  )}

                  <SimpleGrid cols={2} spacing="xs">
                    <div>
                      <Text size="xs" c="dimmed">Items</Text>
                      <Text size="sm">{renderItemsSummary(items)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Registered</Text>
                      <Text size="sm">{getTotalRegistered(items)}/{getTotalQty(items)}</Text>
                    </div>
                  </SimpleGrid>

                  <Collapse expanded={isExpanded}>
                    <Stack gap={4} mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => {
                        const reg = getRegisteredCount(li.itemId)
                        const rem = Math.max(0, li.quantity - reg)
                        return (
                          <div key={li.itemId}>
                            <Group justify="space-between">
                              <Text size="sm">{li.name}</Text>
                              <Group gap={4}>
                                <Badge variant="light" size="sm">{reg}/{li.quantity}</Badge>
                                {rem > 0 && <Badge color="orange" variant="light" size="sm">{rem} left</Badge>}
                              </Group>
                            </Group>
                            {rem > 0 && isExpanded && (
                              <InlineBarcodeInput itemId={li.itemId} registered={reg} remaining={rem} />
                            )}
                          </div>
                        )
                      })}
                    </Stack>
                  </Collapse>
                </Card>
              )
            })}
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>PO ID</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Progress</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  {isAdmin && <Table.Th>Actions</Table.Th>}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredReceipts.map(receipt => {
                  const items = receipt.items
                  const status = getReceiptStatus(receipt)
                  const totalQty = getTotalQty(items)
                  const totalReg = getTotalRegistered(items)
                  const isExpanded = expandedOrders[receipt.id]
                  return (
                    <Fragment key={receipt.id}>
                      <Table.Tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(receipt.id)}>
                        <Table.Td>
                          <Text size="sm" fw={500} c="blue">#{receipt.id.slice(-6)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm">{renderItemsSummary(items)}</Text>
                            <Text size="xs" c="dimmed">{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={totalReg >= totalQty ? 'green' : 'orange'}>
                            {totalReg}/{totalQty} registered
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLOR[status]}>{status}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatDate(receipt.createdAt)}</Text>
                        </Table.Td>
                        {isAdmin && (
                          <Table.Td onClick={e => e.stopPropagation()}>
                            {status !== 'complete' && (
                              <Button size="xs" variant="light" color="green" onClick={() => markReceiptComplete(receipt.id)}>Mark Complete</Button>
                            )}
                          </Table.Td>
                        )}
                      </Table.Tr>
                      {isExpanded && items.map(li => {
                        const reg = getRegisteredCount(li.itemId)
                        const rem = Math.max(0, li.quantity - reg)
                        return (
                          <Table.Tr key={li.itemId} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                            <Table.Td />
                            <Table.Td>
                              <Group gap="xs">
                                <Text size="sm">{li.name}</Text>
                                {li.category && <Badge variant="dot" size="sm">{li.category}</Badge>}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" size="sm">{li.quantity} units</Badge>
                            </Table.Td>
                            <Table.Td colSpan={isAdmin ? 3 : 2}>
                              {rem === 0 ? (
                                <Badge color="green" variant="light" size="sm">✓ All registered</Badge>
                              ) : (
                                <InlineBarcodeInput itemId={li.itemId} registered={reg} remaining={rem} />
                              )}
                            </Table.Td>
                          </Table.Tr>
                        )
                      })}
                    </Fragment>
                  )
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>
    </Stack>
  )
}

function InlineBarcodeInput({ itemId, registered, remaining }) {
  function handleRegister(barcodes) {
    registerUnits(itemId, barcodes)
  }

  return (
    <ScannerInput
      remaining={remaining}
      registered={registered}
      onRegister={handleRegister}
      autoFocus={false}
    />
  )
}
