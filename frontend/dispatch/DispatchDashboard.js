'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  ActionIcon, Badge, Button, Card, Center, Collapse, Drawer, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { formatDate } from '../shared/utils'
import ScannerInput from '../shared/ScannerInput'
import { TRACKING_ENABLED } from '../shared/trackingConfig'

// In-memory barcode store keyed by soItemId → array of { id, barcode, created_at }
const _dispatchBarcodeStore = {}

function getBarcodes(soItemId) {
  return _dispatchBarcodeStore[soItemId] || []
}

function addBarcodes(soItemId, barcodes) {
  const existing = _dispatchBarcodeStore[soItemId] || []
  const newEntries = barcodes.map((b, i) => ({
    id: `${soItemId}-${Date.now()}-${i}`,
    barcode: b,
    created_at: new Date().toISOString(),
  }))
  _dispatchBarcodeStore[soItemId] = [...existing, ...newEntries]
  return newEntries
}

function updateBarcode(soItemId, barcodeId, newBarcode) {
  const list = _dispatchBarcodeStore[soItemId] || []
  _dispatchBarcodeStore[soItemId] = list.map(b => b.id === barcodeId ? { ...b, barcode: newBarcode } : b)
}

function deleteBarcode(soItemId, barcodeId) {
  const list = _dispatchBarcodeStore[soItemId] || []
  _dispatchBarcodeStore[soItemId] = list.filter(b => b.id !== barcodeId)
}

function getBarcodesForItem(itemId, orders) {
  const all = []
  for (const order of orders) {
    for (const li of (order.sales_order_items || [])) {
      if ((li.item_id || li.inventory_items?.id) === itemId) {
        for (const b of getBarcodes(li.id)) {
          all.push({ ...b, soItemId: li.id })
        }
      }
    }
  }
  return all
}

export default function DispatchDashboard({ orders, customersMap = {}, loading, onDispatch }) {
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('approved')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  const [scanVersion, setScanVersion] = useState(0)
  const [barcodeItem, setBarcodeItem] = useState(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  function handleViewBarcodes(item) {
    setBarcodeItem(item)
  }

  function handleScanBarcodes(itemId, soItemId, barcodes) {
    addBarcodes(soItemId, barcodes)
    setScanVersion(v => v + 1)
  }

  function toggleExpand(orderId) {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }))
  }

  function getLineItemScanned(soItemId) {
    return getBarcodes(soItemId).length
  }

  function getOrderScanProgress(order) {
    const items = order.sales_order_items || []
    let total = 0, scanned = 0
    for (const li of items) {
      total += li.quantity
      scanned += getBarcodes(li.id).length
    }
    return { total, scanned }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (searchFilter) {
        const search = searchFilter.toLowerCase()
        const itemNames = (order.sales_order_items || [])
          .map(li => li.inventory_items?.name || '').join(' ').toLowerCase()
        if (
          !itemNames.includes(search) &&
          !(customersMap[order.customer_id]?.name || order.customer_name || '').toLowerCase().includes(search) &&
          !String(order.id).toLowerCase().includes(search)
        ) return false
      }
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(order.updated_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(order.updated_at) > to) return false
      }
      return true
    })
  }, [orders, statusFilter, searchFilter, dateFrom, dateTo, scanVersion])

  const readyCount = orders.filter(o => o.status === 'approved').length
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length
  const totalCount = orders.length

  function renderItemsSummary(items) {
    if (!items || items.length === 0) return 'No items'
    if (items.length === 1) return items[0].inventory_items?.name || 'Unknown'
    return `${items[0].inventory_items?.name || 'Unknown'} +${items.length - 1} more`
  }

  function getTotalQty(items) {
    return (items || []).reduce((sum, li) => sum + li.quantity, 0)
  }

  const statCards = [
    { label: 'All Orders', value: totalCount, color: 'blue', filter: 'all' },
    { label: 'Ready to Dispatch', value: readyCount, color: 'yellow', filter: 'approved' },
    { label: 'Dispatched', value: dispatchedCount, color: 'green', filter: 'dispatched' },
  ]

  const hasFilters = dateFrom || dateTo || searchFilter

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 3 }}>
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
          placeholder="Search by item, customer, order ID…"
          value={searchFilter}
          onChange={e => setSearchFilter(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <TextInput size="sm" type="date" placeholder="From" value={dateFrom} onChange={e => setDateFrom(e.currentTarget.value)} w={140} />
        <TextInput size="sm" type="date" placeholder="To" value={dateTo} onChange={e => setDateTo(e.currentTarget.value)} w={140} />
        {hasFilters && (
          <Button variant="subtle" color="gray" size="sm" onClick={() => { setSearchFilter(''); setDateFrom(''); setDateTo('') }}>Clear</Button>
        )}
      </Group>

      <Paper p="md" radius="md" withBorder>
        {loading ? (
          <Center py="xl"><Loader /></Center>
        ) : filteredOrders.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <Text fw={500} size="lg">No orders to dispatch</Text>
              <Text c="dimmed" size="sm">Orders will appear here once approved by an admin.</Text>
            </Stack>
          </Center>
        ) : isMobile ? (
          <Stack gap="sm">
            {filteredOrders.map(order => {
              const items = order.sales_order_items || []
              const isExpanded = expandedOrders[order.id]
              const progress = getOrderScanProgress(order)
              return (
                <Card key={order.id} padding="sm" radius="md" withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(order.id)}
                >
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={600}>{customersMap[order.customer_id]?.name || order.customer_name || 'Unknown'}</Text>
                      <Text size="xs" c="dimmed">#{order.id}</Text>
                      {(customersMap[order.customer_id]?.address || order.customer_address) && (
                        <Text size="xs" c="dimmed">{customersMap[order.customer_id]?.address || order.customer_address}</Text>
                      )}
                    </div>
                  </Group>

                  <SimpleGrid cols={2} spacing="xs">
                    <div>
                      <Text size="xs" c="dimmed">Items</Text>
                      <Text size="sm">{renderItemsSummary(items)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">{TRACKING_ENABLED ? 'Scanned' : 'Total Qty'}</Text>
                      {TRACKING_ENABLED ? (
                        <Text size="sm" c={progress.scanned >= progress.total ? 'green' : 'orange'}>
                          {progress.scanned}/{progress.total}
                        </Text>
                      ) : (
                        <Text size="sm">{getTotalQty(items)} units</Text>
                      )}
                    </div>
                    {!TRACKING_ENABLED && (
                    <div>
                      <Text size="xs" c="dimmed">Items</Text>
                      <Text size="sm">{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                    </div>
                    )}
                    <div>
                      <Text size="xs" c="dimmed">Approved On</Text>
                      <Text size="sm">{formatDate(order.updated_at)}</Text>
                    </div>
                  </SimpleGrid>

                  <Collapse expanded={isExpanded}>
                    <Stack gap="sm" mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => {
                        const itemId = li.item_id || li.inventory_items?.id
                        const scanned = getLineItemScanned(li.id)
                        const remaining = Math.max(0, li.quantity - scanned)
                        return (
                          <div key={li.id}>
                            <Group justify="space-between">
                              <Text size="sm">{li.inventory_items?.name || 'Unknown'}</Text>
                              <Group gap={4}>
                                {TRACKING_ENABLED ? (
                                  <>
                                    <Badge variant="light" size="sm">{scanned}/{li.quantity}</Badge>
                                    {remaining > 0 && <Badge color="orange" variant="light" size="sm">{remaining} left</Badge>}
                                    <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: itemId, name: li.inventory_items?.name || 'Unknown' }) }}>
                                      View
                                    </Button>
                                  </>
                                ) : (
                                  <Badge variant="light" size="sm">{li.quantity} units</Badge>
                                )}
                              </Group>
                            </Group>
                            {TRACKING_ENABLED && (
                              order.status === 'dispatched' ? (
                                <Badge color="green" variant="light" size="sm" mt={4}>✓ Dispatched</Badge>
                              ) : remaining > 0 ? (
                                <ScannerInput
                                  remaining={remaining}
                                  registered={scanned}
                                  onRegister={(barcodes) => handleScanBarcodes(itemId, li.id, barcodes)}
                                  autoFocus={false}
                                />
                              ) : (
                                <Badge color="green" variant="light" size="sm" mt={4}>✓ All scanned</Badge>
                              )
                            )}
                          </div>
                        )
                      })}
                      {order.status === 'approved' && (
                        <Button size="xs" color="blue" mt="xs" onClick={e => { e.stopPropagation(); onDispatch(order.id) }}>
                          Mark Dispatched
                        </Button>
                      )}
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
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Quantity</Table.Th>
                  <Table.Th>Approved On</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredOrders.map(order => {
                  const items = order.sales_order_items || []
                  const isExpanded = expandedOrders[order.id]
                  const progress = getOrderScanProgress(order)
                  return (
                    <Fragment key={order.id}>
                      <Table.Tr style={{ cursor: 'pointer' }} onClick={() => toggleExpand(order.id)}>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>{customersMap[order.customer_id]?.name || order.customer_name || 'Unknown'}</Text>
                            {(customersMap[order.customer_id]?.mobile || order.customer_contact) && (
                              <Text size="xs" c="dimmed">{customersMap[order.customer_id]?.mobile || order.customer_contact}</Text>
                            )}
                            {(customersMap[order.customer_id]?.address || order.customer_address) && (
                              <Text size="xs" c="dimmed">{customersMap[order.customer_id]?.address || order.customer_address}</Text>
                            )}
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm">{renderItemsSummary(items)}</Text>
                            <Text size="xs" c="dimmed">{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          {TRACKING_ENABLED ? (
                            <Badge variant="light" color={progress.scanned >= progress.total ? 'green' : 'orange'}>
                              {progress.scanned}/{progress.total} scanned
                            </Badge>
                          ) : (
                            <Badge variant="light" color="blue">
                              {getTotalQty(items)} units
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatDate(order.updated_at)}</Text>
                        </Table.Td>
                        <Table.Td onClick={e => e.stopPropagation()}>
                          {order.status === 'approved' && (
                            <Button size="compact-xs" color="blue" onClick={() => onDispatch(order.id)}>
                              Mark Dispatched
                            </Button>
                          )}
                          {order.status === 'dispatched' && (
                            <Badge variant="light" color="green">Completed</Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && items.map(li => {
                        const itemId = li.item_id || li.inventory_items?.id
                        const scanned = getLineItemScanned(li.id)
                        const remaining = Math.max(0, li.quantity - scanned)
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
                              {TRACKING_ENABLED ? (
                                order.status === 'dispatched' ? (
                                  <Badge color="green" variant="light" size="sm">✓ Dispatched</Badge>
                                ) : remaining > 0 ? (
                                  <ScannerInput
                                    remaining={remaining}
                                    registered={scanned}
                                    onRegister={(barcodes) => handleScanBarcodes(itemId, li.id, barcodes)}
                                    autoFocus={false}
                                  />
                                ) : (
                                  <Badge color="green" variant="light" size="sm">✓ All {scanned} scanned</Badge>
                                )
                              ) : (
                                <Badge variant="light" color="gray" size="sm">{li.inventory_items?.item_group || 'N/A'}</Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {TRACKING_ENABLED && (
                                <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: itemId, name: li.inventory_items?.name || 'Unknown' }) }}>
                                  View
                                </Button>
                              )}
                            </Table.Td>
                            <Table.Td />
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
      {TRACKING_ENABLED && (
      <Drawer opened={!!barcodeItem} onClose={() => setBarcodeItem(null)} title={barcodeItem?.name || 'Barcodes'} position="right" size="md">
        {(() => {
          const itemBarcodes = barcodeItem ? getBarcodesForItem(barcodeItem.id, orders) : []
          return itemBarcodes.length === 0 ? (
            <Text ta="center" c="dimmed" py="lg">No barcodes scanned for this item yet.</Text>
          ) : (
            <>
              <Group gap="xs" mb="md">
                <Badge color="green" variant="light" size="sm">{itemBarcodes.length} scanned</Badge>
              </Group>
              <Stack gap="xs">
                {itemBarcodes.map(u => (
                  <BarcodeRow
                    key={u.id}
                    entry={u}
                    onUpdate={(newVal) => { updateBarcode(u.soItemId, u.id, newVal); setScanVersion(v => v + 1) }}
                    onDelete={() => { deleteBarcode(u.soItemId, u.id); setScanVersion(v => v + 1) }}
                  />
                ))}
              </Stack>
            </>
          )
        })()}
      </Drawer>
      )}
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
