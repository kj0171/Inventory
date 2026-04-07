'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import {
  Badge, Button, Card, Center, Collapse, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useAuth, ROLES } from '../shared/auth'
import { formatDate } from '../shared/utils'
import { TRACKING_ENABLED } from '../shared/trackingConfig'
import BarcodeDrawer from '../shared/BarcodeDrawer'
import ConfirmModal from '../shared/ConfirmModal'
import { inventoryUnitService } from '../../backend'

const STATUS_COLOR = {
  pending: 'yellow',
  registered: 'blue',
  completed: 'green',
}

export default function PurchaseOrderDashboard({
  orders, suppliersMap = {}, loading, onMarkComplete, onMarkCompleted, onRevertPending,
}) {
  const { user } = useAuth()
  const isAdmin = user?.profile?.role === ROLES.ADMIN
  const [statusFilter, setStatusFilter] = useState('pending')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  const [unitsMap, setUnitsMap] = useState({})
  const [countsMap, setCountsMap] = useState({})
  const [drawerItem, setDrawerItem] = useState(null)
  const [confirm, setConfirm] = useState({ opened: false, message: '', onConfirm: null })
  const isMobile = useMediaQuery('(max-width: 768px)')

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

  async function fetchUnitsForPO(poId) {
    const { data, error } = await inventoryUnitService.getByPOId(poId)
    if (!error) {
      setUnitsMap(prev => ({ ...prev, [poId]: data }))
      setCountsMap(prev => ({ ...prev, [poId]: (data || []).length }))
    }
  }

  async function handleUpdateBarcode(unitId, newValue) {
    const { error } = await inventoryUnitService.update(unitId, { identifier: newValue })
    if (!error && drawerItem) fetchUnitsForPO(drawerItem.poId)
  }

  async function handleDeleteBarcode(unitId) {
    const { error } = await inventoryUnitService.delete(unitId)
    if (!error && drawerItem) fetchUnitsForPO(drawerItem.poId)
  }

  function toggleExpand(orderId) {
    setExpandedOrders(prev => {
      const next = { ...prev, [orderId]: !prev[orderId] }
      if (TRACKING_ENABLED && next[orderId] && !unitsMap[orderId]) {
        fetchUnitsForPO(orderId)
      }
      return next
    })
  }

  function getLineItemUnits(poId, inventoryId) {
    return (unitsMap[poId] || []).filter(u => u.inventory_id === inventoryId)
  }

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) return false
      if (searchFilter) {
        const search = searchFilter.toLowerCase()
        const itemNames = (order.purchase_order_items || [])
          .map(li => li.inventory_items?.name || '').join(' ').toLowerCase()
        const supplierName = (suppliersMap[order.supplier_id]?.name || '').toLowerCase()
        const firmName = (suppliersMap[order.supplier_id]?.firm_name || '').toLowerCase()
        if (
          !itemNames.includes(search) &&
          !supplierName.includes(search) &&
          !firmName.includes(search) &&
          !String(order.id).includes(search)
        ) return false
      }
      if (dateFrom) {
        if (new Date(order.created_at) < new Date(dateFrom)) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(order.created_at) > to) return false
      }
      return true
    })
  }, [orders, suppliersMap, statusFilter, searchFilter, dateFrom, dateTo])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    registered: orders.filter(o => o.status === 'registered').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders])

  function formatCurrency(val) {
    if (!val) return '—'
    return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
  }

  function renderItemsSummary(items) {
    if (!items || items.length === 0) return 'No items'
    if (items.length === 1) return items[0].inventory_items?.name || 'Unknown'
    return `${items[0].inventory_items?.name || 'Unknown'} +${items.length - 1} more`
  }

  function getTotalQty(items) {
    return (items || []).reduce((sum, li) => sum + li.quantity, 0)
  }

  function getTotalValue(items) {
    return (items || []).reduce((sum, li) => sum + (li.quantity * (li.price || 0)), 0)
  }

  function handleMarkCompleted(order) {
    const totalQty = getTotalQty(order.purchase_order_items)
    const registeredCount = countsMap[order.id] || 0
    if (registeredCount < totalQty) {
      setConfirm({
        opened: true,
        message: `Only ${registeredCount} of ${totalQty} units have registered. Are you sure you want to mark this PO as completed?`,
        onConfirm: () => onMarkCompleted?.(order.id),
      })
      return
    }
    onMarkCompleted?.(order.id)
  }

  const statCards = [
    { label: 'All POs', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Pending', value: stats.pending, color: 'yellow', filter: 'pending' },
    { label: 'Registered', value: stats.registered, color: 'blue', filter: 'registered' },
    { label: 'Completed', value: stats.completed, color: 'green', filter: 'completed' },
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
          placeholder="Search by item, supplier…"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <TextInput size="sm" type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.currentTarget.value)} w={140} />
        <TextInput size="sm" type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.currentTarget.value)} w={140} />
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
              <Text c="dimmed" size="sm">Add stock from the Inventory tab to create a purchase order.</Text>
            </Stack>
          </Center>
        ) : isMobile ? (
          <Stack gap="sm">
            {filteredOrders.map(order => {
              const items = order.purchase_order_items || []
              const isExpanded = expandedOrders[order.id]
              const supplier = suppliersMap[order.supplier_id]
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
                    <Badge color={STATUS_COLOR[order.status] || 'gray'}>{order.status}</Badge>
                  </Group>

                  <SimpleGrid cols={2} spacing="xs">
                    <div>
                      <Text size="xs" c="dimmed">Items</Text>
                      <Text size="sm">{renderItemsSummary(items)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Total Qty</Text>
                      <Text size="sm">{getTotalQty(items)} units</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Value</Text>
                      <Text size="sm" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(getTotalValue(items))}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Created</Text>
                      <Text size="sm">{formatDate(order.created_at)}</Text>
                    </div>
                  </SimpleGrid>

                  <Collapse expanded={isExpanded}>
                    <Stack gap={4} mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => {
                        return (
                          <div key={li.id}>
                            <Group justify="space-between">
                              <Text size="sm">{li.inventory_items?.name || 'Unknown'}</Text>
                              <Group gap="xs">
                                <Badge variant="light" size="sm">{li.quantity} units</Badge>
                                <Text size="xs" c="dimmed">{formatCurrency(li.price)}/unit</Text>
                                {TRACKING_ENABLED && (() => {
                                  const units = getLineItemUnits(order.id, li.inventory_id)
                                  return units.length > 0 ? (
                                    <Button size="compact-xs" variant="subtle" onClick={(e) => { e.stopPropagation(); setDrawerItem({ poId: order.id, inventoryId: li.inventory_id, name: li.inventory_items?.name || 'Unknown' }) }}>
                                      View ({units.length})
                                    </Button>
                                  ) : null
                                })()}
                              </Group>
                            </Group>
                          </div>
                        )
                      })}
                      {order.notes && (
                        <Text size="xs" c="dimmed" mt="xs">Notes: {order.notes}</Text>
                      )}
                      {isAdmin && order.status === 'pending' && (
                        <Button
                          size="xs" variant="light" color="green" mt="xs"
                          onClick={(e) => { e.stopPropagation(); handleMarkCompleted(order) }}
                        >
                          Mark Complete
                        </Button>
                      )}
                      {isAdmin && order.status === 'registered' && (
                        <Group gap="xs" mt="xs">
                          <Button
                            size="xs" variant="light" color="green"
                            onClick={(e) => { e.stopPropagation(); handleMarkCompleted(order) }}
                          >
                            Mark Completed
                          </Button>
                          <Button
                            size="xs" variant="light" color="orange"
                            onClick={(e) => { e.stopPropagation(); onRevertPending?.(order.id) }}
                          >
                            Back to Pending
                          </Button>
                        </Group>
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
                  <Table.Th>Total Qty</Table.Th>
                  <Table.Th>Value</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  {isAdmin && <Table.Th />}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredOrders.map(order => {
                  const items = order.purchase_order_items || []
                  const isExpanded = expandedOrders[order.id]
                  const supplier = suppliersMap[order.supplier_id]
                  return (
                    <Fragment key={order.id}>
                      <Table.Tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleExpand(order.id)}
                      >
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
                          <Badge variant="light">{getTotalQty(items)} units</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} style={{ whiteSpace: 'nowrap' }}>{formatCurrency(getTotalValue(items))}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLOR[order.status] || 'gray'}>{order.status}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatDate(order.created_at)}</Text>
                        </Table.Td>
                        {isAdmin && (
                          <Table.Td onClick={(e) => e.stopPropagation()}>
                            {order.status === 'pending' && (
                              <Button size="xs" variant="light" color="green" onClick={() => handleMarkCompleted(order)}>
                                Mark Complete
                              </Button>
                            )}
                            {order.status === 'registered' && (
                              <Group gap="xs">
                                <Button size="xs" variant="light" color="green" onClick={() => handleMarkCompleted(order)}>
                                  Mark Completed
                                </Button>
                                <Button size="xs" variant="light" color="orange" onClick={() => onRevertPending?.(order.id)}>
                                  Back to Pending
                                </Button>
                              </Group>
                            )}
                          </Table.Td>
                        )}
                      </Table.Tr>
                      {isExpanded && items.map(li => {
                        return (
                          <Table.Tr key={li.id} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                            <Table.Td colSpan={2}>
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
                            <Table.Td colSpan={isAdmin ? 4 : 3}>
                              <Group gap="xs">
                                <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(li.price)}/unit</Text>
                                {TRACKING_ENABLED && (() => {
                                  const units = getLineItemUnits(order.id, li.inventory_id)
                                  return units.length > 0 ? (
                                    <Button size="compact-xs" variant="subtle" onClick={() => setDrawerItem({ poId: order.id, inventoryId: li.inventory_id, name: li.inventory_items?.name || 'Unknown' })}>
                                      View ({units.length})
                                    </Button>
                                  ) : null
                                })()}
                              </Group>
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

      {TRACKING_ENABLED && <BarcodeDrawer
        opened={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        title={drawerItem?.name || 'Barcodes'}
        barcodes={drawerItem ? getLineItemUnits(drawerItem.poId, drawerItem.inventoryId).map(u => ({ ...u, barcode: u.identifier })) : []}
        onUpdate={handleUpdateBarcode}
        onDelete={handleDeleteBarcode}
        badgeLabel="registered"
      />}

      <ConfirmModal
        opened={confirm.opened}
        onClose={() => setConfirm({ opened: false, message: '', onConfirm: null })}
        onConfirm={confirm.onConfirm || (() => {})}
        title="Incomplete Registration"
        message={confirm.message}
        confirmLabel="Yes, Complete"
        confirmColor="orange"
        cancelLabel="Cancel"
      />
    </Stack>
  )
}
