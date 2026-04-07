'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  ActionIcon, Badge, Button, Card, Center, Collapse, Drawer, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { formatDate } from '../shared/utils'
import ScannerInput from '../shared/ScannerInput'

// In-memory barcode store keyed by poItemId → array of { id, barcode, created_at }
const _barcodeStore = {}

function getBarcodes(poItemId) {
  return _barcodeStore[poItemId] || []
}

function addBarcodes(poItemId, barcodes) {
  const existing = _barcodeStore[poItemId] || []
  const newEntries = barcodes.map((b, i) => ({
    id: `${poItemId}-${Date.now()}-${i}`,
    barcode: b,
    created_at: new Date().toISOString(),
  }))
  _barcodeStore[poItemId] = [...existing, ...newEntries]
  return newEntries
}

function updateBarcode(poItemId, barcodeId, newBarcode) {
  const list = _barcodeStore[poItemId] || []
  _barcodeStore[poItemId] = list.map(b => b.id === barcodeId ? { ...b, barcode: newBarcode } : b)
}

function deleteBarcode(poItemId, barcodeId) {
  const list = _barcodeStore[poItemId] || []
  _barcodeStore[poItemId] = list.filter(b => b.id !== barcodeId)
}

function getBarcodesForItem(inventoryId, orders) {
  const all = []
  for (const order of orders) {
    for (const li of (order.purchase_order_items || [])) {
      if (li.inventory_id === inventoryId) {
        for (const b of getBarcodes(li.id)) {
          all.push({ ...b, poItemId: li.id })
        }
      }
    }
  }
  return all
}

export default function RegistrationDashboard({
  orders, suppliersMap = {}, loading, onMarkComplete,
}) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  const [regVersion, setRegVersion] = useState(0)
  const [barcodeItem, setBarcodeItem] = useState(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  function handleViewBarcodes(item) {
    setBarcodeItem(item)
  }

  function toggleExpand(orderId) {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  function getLineItemReg(poItemId) {
    const barcodes = getBarcodes(poItemId)
    return { registered: barcodes.length }
  }

  function getOrderRegProgress(order) {
    const items = order.purchase_order_items || []
    let total = 0, registered = 0
    for (const li of items) {
      total += li.quantity
      registered += getBarcodes(li.id).length
    }
    return { total, registered }
  }

  function getOrderStatus(order) {
    if (order.status === 'received') return 'complete'
    const { total, registered } = getOrderRegProgress(order)
    if (total === 0) return 'pending'
    if (registered >= total) return 'complete'
    if (registered > 0) return 'partial'
    return 'pending'
  }

  function handleRegisterBarcodes(inventoryId, poItemId, barcodes) {
    addBarcodes(poItemId, barcodes)
    setRegVersion(v => v + 1)
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all') {
        const s = getOrderStatus(order)
        if (s !== statusFilter) return false
      }
      if (searchFilter) {
        const search = searchFilter.toLowerCase()
        const itemNames = (order.purchase_order_items || [])
          .map(li => li.inventory_items?.name || '').join(' ').toLowerCase()
        const supplierName = (suppliersMap[order.supplier_id]?.name || '').toLowerCase()
        const firmName = (suppliersMap[order.supplier_id]?.firm_name || '').toLowerCase()
        if (
          !itemNames.includes(search) &&
          !supplierName.includes(search) &&
          !firmName.includes(search)
        ) return false
      }
      if (dateFrom && new Date(order.created_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(order.created_at) > to) return false
      }
      return true
    })
  }, [orders, suppliersMap, statusFilter, searchFilter, dateFrom, dateTo, regVersion])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => getOrderStatus(o) === 'pending').length,
    partial: orders.filter(o => getOrderStatus(o) === 'partial').length,
    complete: orders.filter(o => getOrderStatus(o) === 'complete').length,
  }), [orders, regVersion])

  function renderItemsSummary(items) {
    if (!items || items.length === 0) return 'No items'
    if (items.length === 1) return items[0].inventory_items?.name || 'Unknown'
    return `${items[0].inventory_items?.name || 'Unknown'} +${items.length - 1} more`
  }

  function getTotalQty(items) {
    return (items || []).reduce((sum, li) => sum + li.quantity, 0)
  }

  const statCards = [
    { label: 'All POs', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Pending', value: stats.pending, color: 'orange', filter: 'pending' },
    { label: 'Partial', value: stats.partial, color: 'yellow', filter: 'partial' },
    { label: 'Complete', value: stats.complete, color: 'green', filter: 'complete' },
  ]

  return (
    <Stack gap="md">
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

      <Group gap="sm">
        <TextInput
          size="sm"
          placeholder="Search items, supplier…"
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

      <Paper p="md" radius="md" withBorder>
        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : filteredOrders.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Text fw={500} size="lg">No purchase orders found</Text>
              <Text c="dimmed" size="sm">{orders.length === 0 ? 'Add stock first to create purchase orders.' : 'Try adjusting the filters.'}</Text>
            </Stack>
          </Center>
        ) : isMobile ? (
          <Stack gap="sm">
            {filteredOrders.map(order => {
              const items = order.purchase_order_items || []
              const isExpanded = expandedOrders[order.id]
              const supplier = suppliersMap[order.supplier_id]
              const regProgress = getOrderRegProgress(order)
              const status = getOrderStatus(order)
              return (
                <Card key={order.id} padding="sm" radius="md" withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(order.id)}
                >
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={600}>{supplier?.name || 'Unknown Supplier'}</Text>
                      {supplier?.firm_name && <Text size="xs" c="dimmed">{supplier.firm_name}</Text>}
                    </div>
                  </Group>

                  <SimpleGrid cols={2} spacing="xs">
                    <div>
                      <Text size="xs" c="dimmed">Items</Text>
                      <Text size="sm">{renderItemsSummary(items)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Registered</Text>
                      <Text size="sm" c={regProgress.registered >= regProgress.total ? 'green' : 'orange'}>
                        {regProgress.registered}/{regProgress.total}
                      </Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Total Qty</Text>
                      <Text size="sm">{getTotalQty(items)} units</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Created</Text>
                      <Text size="sm">{formatDate(order.created_at)}</Text>
                    </div>
                  </SimpleGrid>

                  <Collapse expanded={isExpanded}>
                    <Stack gap="sm" mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => {
                        const reg = getLineItemReg(li.id)
                        const remaining = Math.max(0, li.quantity - reg.registered)
                        return (
                          <div key={li.id}>
                            <Group justify="space-between">
                              <Text size="sm">{li.inventory_items?.name || 'Unknown'}</Text>
                              <Group gap={4}>
                                <Badge variant="light" size="sm">{reg.registered}/{li.quantity}</Badge>
                                {remaining > 0 && <Badge color="orange" variant="light" size="sm">{remaining} left</Badge>}
                                <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: li.inventory_id, name: li.inventory_items?.name || 'Unknown' }) }}>
                                  View
                                </Button>
                              </Group>
                            </Group>
                            {remaining > 0 ? (
                              <ScannerInput
                                remaining={remaining}
                                registered={reg.registered}
                                onRegister={(barcodes) => handleRegisterBarcodes(li.inventory_id, li.id, barcodes)}
                                autoFocus={false}
                              />
                            ) : (
                              <Badge color="green" variant="light" size="sm" mt={4}>✓ All registered</Badge>
                            )}
                          </div>
                        )
                      })}
                      <Button size="xs" color="blue" mt="xs" onClick={e => { e.stopPropagation(); onMarkComplete?.(order.id) }}>
                        Mark Complete
                      </Button>
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
                  <Table.Th>Supplier</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Progress</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredOrders.map(order => {
                  const items = order.purchase_order_items || []
                  const regProgress = getOrderRegProgress(order)
                  const status = getOrderStatus(order)
                  const isExpanded = expandedOrders[order.id]
                  const supplier = suppliersMap[order.supplier_id]
                  return (
                    <Fragment key={order.id}>
                      <Table.Tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(order.id)}>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>{supplier?.name || 'Unknown'}</Text>
                            {supplier?.firm_name && <Text size="xs" c="dimmed">{supplier.firm_name}</Text>}
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm">{renderItemsSummary(items)}</Text>
                            <Text size="xs" c="dimmed">{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={regProgress.registered >= regProgress.total ? 'green' : 'orange'}>
                            {regProgress.registered}/{regProgress.total} registered
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatDate(order.created_at)}</Text>
                        </Table.Td>
                        <Table.Td onClick={e => e.stopPropagation()}>
                          <Button size="compact-xs" color="blue" onClick={() => onMarkComplete?.(order.id)}>
                            Mark Complete
                          </Button>
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && items.map(li => {
                        const reg = getLineItemReg(li.id)
                        const remaining = Math.max(0, li.quantity - reg.registered)
                        return (
                          <Table.Tr key={li.id} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                            <Table.Td>
                              <Group gap="xs">
                                <Text size="sm">{li.inventory_items?.name || 'Unknown'}</Text>
                                {li.inventory_items?.item_category && (
                                  <Badge variant="dot" size="sm">{li.inventory_items.item_category}</Badge>
                                )}
                              </Group>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" size="sm">{li.quantity} units</Badge>
                            </Table.Td>
                            <Table.Td>
                              {remaining > 0 ? (
                                <ScannerInput
                                  remaining={remaining}
                                  registered={reg.registered}
                                  onRegister={(barcodes) => handleRegisterBarcodes(li.inventory_id, li.id, barcodes)}
                                  autoFocus={false}
                                />
                              ) : (
                                <Badge color="green" variant="light" size="sm">✓ All {reg.registered} registered</Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: li.inventory_id, name: li.inventory_items?.name || 'Unknown' }) }}>
                                View
                              </Button>
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

      {/* Barcode Drawer */}
      <Drawer opened={!!barcodeItem} onClose={() => setBarcodeItem(null)} title={barcodeItem?.name || 'Barcodes'} position="right" size="md">
        {(() => {
          const itemBarcodes = barcodeItem ? getBarcodesForItem(barcodeItem.id, orders) : []
          return itemBarcodes.length === 0 ? (
            <Text ta="center" c="dimmed" py="lg">No barcodes registered for this item yet.</Text>
          ) : (
            <>
              <Group gap="xs" mb="md">
                <Badge color="green" variant="light" size="sm">{itemBarcodes.length} registered</Badge>
              </Group>
              <Stack gap="xs">
                {itemBarcodes.map(u => (
                  <BarcodeRow
                    key={u.id}
                    entry={u}
                    onUpdate={(newVal) => { updateBarcode(u.poItemId, u.id, newVal); setRegVersion(v => v + 1) }}
                    onDelete={() => { deleteBarcode(u.poItemId, u.id); setRegVersion(v => v + 1) }}
                  />
                ))}
              </Stack>
            </>
          )
        })()}
      </Drawer>
    </Stack>
  )
}

function BarcodeRow({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(entry.barcode)

  function handleSave() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== entry.barcode) {
      onUpdate(trimmed)
    }
    setEditing(false)
  }

  return (
    <Group gap="xs" justify="space-between" wrap="nowrap" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: 6 }}>
      {editing ? (
        <TextInput
          size="xs"
          value={value}
          onChange={e => setValue(e.currentTarget.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setValue(entry.barcode); setEditing(false) } }}
          onBlur={handleSave}
          autoFocus
          style={{ flex: 1 }}
        />
      ) : (
        <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditing(true)}>
          <Text size="sm" fw={500}>{entry.barcode}</Text>
          <Text size="xs" c="dimmed">{formatDate(entry.created_at)}</Text>
        </div>
      )}
      <Group gap={4} wrap="nowrap">
        {!editing && (
          <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => setEditing(true)}>
            ✎
          </ActionIcon>
        )}
        <ActionIcon size="sm" variant="subtle" color="red" onClick={onDelete}>
          ✕
        </ActionIcon>
      </Group>
    </Group>
  )
}
