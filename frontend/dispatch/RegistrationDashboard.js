'use client'

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  Badge, Button, Card, Center, Collapse, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { formatDate } from '../shared/utils'
import ScannerInput from '../shared/ScannerInput'
import BarcodeDrawer from '../shared/BarcodeDrawer'
import { inventoryUnitService } from '../../backend'

export default function RegistrationDashboard({
  orders, suppliersMap = {}, loading, onMarkComplete,
}) {
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  // Counts per PO for progress badges (loaded in bulk on mount)
  const [countsMap, setCountsMap] = useState({})
  // Full unit rows per PO (lazy loaded on expand)
  const [unitsMap, setUnitsMap] = useState({})
  const [barcodeItem, setBarcodeItem] = useState(null)
  const isMobile = useMediaQuery('(max-width: 768px)')

  // Fetch full unit rows for a PO (called on expand)
  const fetchUnitsForPO = useCallback(async (poId) => {
    const { data, error } = await inventoryUnitService.getByPOId(poId)
    if (!error) {
      setUnitsMap(prev => ({ ...prev, [poId]: data }))
      setCountsMap(prev => ({ ...prev, [poId]: (data || []).length }))
    }
  }, [])

  // Fetch counts for all POs in one query on mount
  useEffect(() => {
    async function loadCounts() {
      const poIds = orders.map(o => o.id)
      if (poIds.length === 0) return
      const { data } = await inventoryUnitService.getCountsByPOIds(poIds)
      if (data) setCountsMap(data)
    }
    loadCounts()
  }, [orders])

  function handleViewBarcodes(item) {
    setBarcodeItem(item)
  }

  function toggleExpand(orderId) {
    setExpandedOrders(prev => {
      const next = { ...prev, [orderId]: !prev[orderId] }
      // Fetch units when expanding
      if (next[orderId] && !unitsMap[orderId]) {
        fetchUnitsForPO(orderId)
      }
      return next
    })
  }

  // Get units for a specific PO line item from state
  function getLineItemUnits(poId, inventoryId) {
    return (unitsMap[poId] || []).filter(u => u.inventory_id === inventoryId)
  }

  function getOrderRegProgress(order) {
    const items = order.purchase_order_items || []
    let total = 0
    for (const li of items) total += li.quantity
    return { total, registered: countsMap[order.id] || 0 }
  }

  function getOrderStatus(order) {
    if (order.status === 'registered' || order.status === 'completed') return 'complete'
    return 'pending'
  }

  async function handleRegisterBarcodes(inventoryId, poId, barcodes) {
    const units = barcodes.map(b => ({
      inventory_id: inventoryId,
      po_id: poId,
      identifier: b,
    }))
    const { error } = await inventoryUnitService.create(units)
    if (!error) {
      fetchUnitsForPO(poId)
    }
  }

  async function handleUpdateBarcode(unitId, newValue, poId) {
    const { error } = await inventoryUnitService.update(unitId, { identifier: newValue })
    if (!error) fetchUnitsForPO(poId)
  }

  async function handleDeleteBarcode(unitId, poId) {
    const { error } = await inventoryUnitService.delete(unitId)
    if (!error) fetchUnitsForPO(poId)
  }

  // Get all units for a given inventory_id across all loaded POs (for the drawer)
  function getUnitsForInventoryItem(inventoryId) {
    const all = []
    for (const [poId, units] of Object.entries(unitsMap)) {
      for (const u of units) {
        if (u.inventory_id === inventoryId) {
          all.push({ ...u, barcode: u.identifier, poId })
        }
      }
    }
    return all
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
  }, [orders, suppliersMap, statusFilter, searchFilter, dateFrom, dateTo, countsMap])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => getOrderStatus(o) === 'pending').length,
    partial: orders.filter(o => getOrderStatus(o) === 'partial').length,
    complete: orders.filter(o => getOrderStatus(o) === 'complete').length,
  }), [orders, countsMap])

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
    { label: 'Complete', value: stats.complete, color: 'green', filter: 'complete' },
  ]

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 3, sm: 4 }}>
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

      <Stack gap="xs">
        <TextInput
          size="sm"
          placeholder="Search items, supplier…"
          value={searchFilter}
          onChange={e => setSearchFilter(e.currentTarget.value)}
        />
        <Group gap="sm">
          <TextInput size="sm" type="date" placeholder="From" value={dateFrom} onChange={e => setDateFrom(e.currentTarget.value)} style={{ flex: 1 }} />
          <TextInput size="sm" type="date" placeholder="To" value={dateTo} onChange={e => setDateTo(e.currentTarget.value)} style={{ flex: 1 }} />
          {(dateFrom || dateTo || searchFilter) && (
            <Button variant="subtle" color="gray" size="sm" onClick={() => { setSearchFilter(''); setDateFrom(''); setDateTo('') }}>Clear</Button>
          )}
        </Group>
      </Stack>

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
                    <Stack gap="md" mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => {
                        const lineUnits = getLineItemUnits(order.id, li.inventory_id)
                        const registered = lineUnits.length
                        const remaining = Math.max(0, li.quantity - registered)
                        return (
                          <Stack key={li.id} gap={6}>
                            <Group justify="space-between" wrap="nowrap">
                              <Text size="sm" fw={500} style={{ flex: 1, minWidth: 0 }}>{li.inventory_items?.name || 'Unknown'}</Text>
                              <Group gap={4} wrap="nowrap">
                                <Badge variant="light" size="sm">{registered}/{li.quantity}</Badge>
                                {remaining > 0 && <Badge color="orange" variant="light" size="sm">{remaining} left</Badge>}
                              </Group>
                            </Group>
                            {remaining > 0 && status !== 'complete' ? (
                              <ScannerInput
                                remaining={remaining}
                                registered={registered}
                                onRegister={(barcodes) => handleRegisterBarcodes(li.inventory_id, order.id, barcodes)}
                                autoFocus={false}
                              />
                            ) : (
                              <Badge color="green" variant="light" size="sm">✓ All registered</Badge>
                            )}
                            <Group gap={4}>
                              <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: li.inventory_id, name: li.inventory_items?.name || 'Unknown', poId: order.id }) }}>
                                View
                              </Button>
                            </Group>
                          </Stack>
                        )
                      })}
                      {status !== 'complete' && (
                        <Button size="xs" color="blue" mt="xs" onClick={e => { e.stopPropagation(); onMarkComplete?.(order.id) }}>
                          Mark Complete
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
                          {status !== 'complete' && (
                            <Button size="compact-xs" color="blue" onClick={() => onMarkComplete?.(order.id)}>
                              Mark Complete
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && items.map(li => {
                        const lineUnits = getLineItemUnits(order.id, li.inventory_id)
                        const registered = lineUnits.length
                        const remaining = Math.max(0, li.quantity - registered)
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
                              <Badge variant="light" size="sm">{registered}/{li.quantity} registered</Badge>
                            </Table.Td>
                            <Table.Td>
                              {remaining > 0 && status !== 'complete' ? (
                                <ScannerInput
                                  remaining={remaining}
                                  registered={registered}
                                  onRegister={(barcodes) => handleRegisterBarcodes(li.inventory_id, order.id, barcodes)}
                                  autoFocus={false}
                                />
                              ) : (
                                <Badge color="green" variant="light" size="sm">✓ All {registered} registered</Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Button size="compact-xs" variant="light" onClick={(e) => { e.stopPropagation(); handleViewBarcodes({ id: li.inventory_id, name: li.inventory_items?.name || 'Unknown', poId: order.id }) }}>
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
      <BarcodeDrawer
        opened={!!barcodeItem}
        onClose={() => setBarcodeItem(null)}
        title={barcodeItem?.name || 'Barcodes'}
        barcodes={barcodeItem ? getUnitsForInventoryItem(barcodeItem.id) : []}
        onUpdate={(unitId, newVal) => {
          const unit = getUnitsForInventoryItem(barcodeItem.id).find(u => u.id === unitId)
          if (unit) handleUpdateBarcode(unitId, newVal, unit.poId)
        }}
        onDelete={(unitId) => {
          const unit = getUnitsForInventoryItem(barcodeItem.id).find(u => u.id === unitId)
          if (unit) handleDeleteBarcode(unitId, unit.poId)
        }}
        badgeLabel="registered"
      />
    </Stack>
  )
}
