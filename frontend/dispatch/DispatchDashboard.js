'use client'

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  Alert, Badge, Button, Card, Center, Collapse, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { formatDate } from '../shared/utils'
import ScannerInput from '../shared/ScannerInput'
import BarcodeDrawer from '../shared/BarcodeDrawer'
import { TRACKING_ENABLED } from '../shared/trackingConfig'
import ConfirmModal from '../shared/ConfirmModal'
import { inventoryUnitService } from '../../backend'

export default function DispatchDashboard({ orders, customersMap = {}, loading, onDispatch }) {
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('approved')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  const [countsMap, setCountsMap] = useState({})
  const [unitsMap, setUnitsMap] = useState({})
  const [barcodeItem, setBarcodeItem] = useState(null)
  const [dispatching, setDispatching] = useState(false)
  const [confirm, setConfirm] = useState({ opened: false, message: '', onConfirm: null })
  const [dispatchAlert, setDispatchAlert] = useState('')
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Fetch full unit rows for an SO (called on expand)
  const fetchUnitsForSO = useCallback(async (soId) => {
    const { data, error } = await inventoryUnitService.getBySOId(soId)
    if (!error) {
      setUnitsMap(prev => ({ ...prev, [soId]: data }))
      setCountsMap(prev => ({ ...prev, [soId]: (data || []).length }))
    }
  }, [])

  // Fetch counts for all SOs in bulk on mount / orders change
  useEffect(() => {
    async function loadCounts() {
      const soIds = orders.map(o => o.id)
      if (soIds.length === 0) return
      const { data } = await inventoryUnitService.getCountsBySOIds(soIds)
      if (data) setCountsMap(data)
    }
    loadCounts()
  }, [orders])

  function handleViewBarcodes(item, soId) {
    setBarcodeItem({ ...item, soId })
  }

  // Get units for a specific SO line item from state
  function getLineItemUnits(soId, inventoryId) {
    return (unitsMap[soId] || []).filter(u => u.inventory_id === inventoryId)
  }

  async function handleScanBarcodes(inventoryId, soId, barcodes) {
    const units = barcodes.map(b => ({
      inventory_id: inventoryId,
      so_id: soId,
      identifier: b,
    }))
    const { error } = await inventoryUnitService.create(units)
    if (!error) {
      fetchUnitsForSO(soId)
    }
  }

  async function handleUpdateBarcode(unitId, newValue, soId) {
    const { error } = await inventoryUnitService.update(unitId, { identifier: newValue })
    if (!error) fetchUnitsForSO(soId)
  }

  async function handleDeleteBarcode(unitId, soId) {
    const { error } = await inventoryUnitService.delete(unitId)
    if (!error) fetchUnitsForSO(soId)
  }

  async function handleDispatchOrder(orderId) {
    if (!TRACKING_ENABLED) {
      onDispatch(orderId)
      return
    }

    const order = orders.find(o => o.id === orderId)
    if (!order) return

    setDispatching(true)
    setDispatchAlert('')

    // Fetch all units tagged to this SO
    const { data: soUnits } = await inventoryUnitService.getBySOId(orderId)
    const taggedIdentifiers = (soUnits || []).map(u => u.identifier)

    if (taggedIdentifiers.length === 0) {
      // No barcodes tagged — just dispatch normally
      await onDispatch(orderId)
      setDispatching(false)
      return
    }

    // Check which of those identifiers already existed in inventory_units before this SO tagged them
    // (i.e. they have a po_id — they came from PO registration)
    const withPO = (soUnits || []).filter(u => u.po_id)
    const withoutPO = (soUnits || []).filter(u => !u.po_id)

    async function processSoldAndDispatch() {
      // Mark all SO-tagged units as sold
      const allIds = (soUnits || []).map(u => u.id)
      if (allIds.length > 0) {
        await inventoryUnitService.markSold(allIds, orderId)
      }
      await onDispatch(orderId)
      setDispatching(false)
    }

    if (withoutPO.length > 0) {
      setDispatching(false)
      const names = withoutPO.map(u => u.identifier).join(', ')
      setConfirm({
        opened: true,
        message: `The following ${withoutPO.length} barcode(s) were not found in the purchase registry:\n\n${names}\n\nThese items were not scanned during purchase registration. Do you still want to proceed and mark them as sold?`,
        onConfirm: async () => {
          setDispatching(true)
          await processSoldAndDispatch()
        },
      })
    } else {
      await processSoldAndDispatch()
    }
  }

  function toggleExpand(orderId) {
    setExpandedOrders(prev => {
      const next = { ...prev, [orderId]: !prev[orderId] }
      if (next[orderId] && !unitsMap[orderId]) {
        fetchUnitsForSO(orderId)
      }
      return next
    })
  }

  function getLineItemScanned(soId, inventoryId) {
    return getLineItemUnits(soId, inventoryId).length
  }

  function getOrderScanProgress(order) {
    const items = order.sales_order_items || []
    let total = 0
    for (const li of items) total += li.quantity
    return { total, scanned: countsMap[order.id] || 0 }
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
  }, [orders, statusFilter, searchFilter, dateFrom, dateTo])

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
                        const scanned = getLineItemScanned(order.id, itemId)
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
                                    <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: itemId, name: li.inventory_items?.name || 'Unknown' }, order.id) }}>
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
                                  onRegister={(barcodes) => handleScanBarcodes(itemId, order.id, barcodes)}
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
                        <Button size="xs" color="blue" mt="xs" loading={dispatching} onClick={e => { e.stopPropagation(); handleDispatchOrder(order.id) }}>
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
                            <Button size="compact-xs" color="blue" loading={dispatching} onClick={() => handleDispatchOrder(order.id)}>
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
                        const scanned = getLineItemScanned(order.id, itemId)
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
                                    onRegister={(barcodes) => handleScanBarcodes(itemId, order.id, barcodes)}
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
                                <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: itemId, name: li.inventory_items?.name || 'Unknown' }, order.id) }}>
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
      {TRACKING_ENABLED && (() => {
        const soId = barcodeItem?.soId
        const itemUnits = barcodeItem ? getLineItemUnits(soId, barcodeItem.id) : []
        const barcodes = itemUnits.map(u => ({ id: u.id, barcode: u.identifier, created_at: u.created_at }))
        return (
          <BarcodeDrawer
            opened={!!barcodeItem}
            onClose={() => setBarcodeItem(null)}
            title={barcodeItem?.name || 'Barcodes'}
            barcodes={barcodes}
            onUpdate={(unitId, newVal) => handleUpdateBarcode(unitId, newVal, soId)}
            onDelete={(unitId) => handleDeleteBarcode(unitId, soId)}
            badgeLabel="scanned"
          />
        )
      })()}

      {dispatchAlert && (
        <Alert color="red" withCloseButton onClose={() => setDispatchAlert('')} mt="md">
          {dispatchAlert}
        </Alert>
      )}

      <ConfirmModal
        opened={confirm.opened}
        onClose={() => { setConfirm({ opened: false, message: '', onConfirm: null }); setDispatching(false) }}
        onConfirm={async () => { setConfirm(c => ({ ...c, opened: false })); if (confirm.onConfirm) await confirm.onConfirm() }}
        title="Unregistered Barcodes Detected"
        message={confirm.message}
        confirmLabel="Proceed Anyway"
        confirmColor="orange"
      />
    </Stack>
  )
}
