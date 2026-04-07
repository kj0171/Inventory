'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  Badge, Button, Card, Center, Collapse, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { useAuth, ROLES } from '../shared/auth'
import { formatDate } from '../shared/utils'

const STATUS_COLOR = {
  pending: 'yellow',
  received: 'green',
}

export default function PurchaseOrderDashboard({
  orders, suppliersMap = {}, loading, onMarkComplete,
}) {
  const { user } = useAuth()
  const isAdmin = user?.profile?.role === ROLES.ADMIN
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchFilter, setSearchFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedOrders, setExpandedOrders] = useState({})
  const isMobile = useMediaQuery('(max-width: 768px)')

  function toggleExpand(orderId) {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }))
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
    received: orders.filter(o => o.status === 'received').length,
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

  const statCards = [
    { label: 'All POs', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Pending', value: stats.pending, color: 'yellow', filter: 'pending' },
    { label: 'Received', value: stats.received, color: 'green', filter: 'received' },
  ]

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 3, sm: 3 }}>
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
                          onClick={(e) => { e.stopPropagation(); onMarkComplete?.(order.id) }}
                        >
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
                              <Button size="xs" variant="light" color="green" onClick={() => onMarkComplete?.(order.id)}>
                                Mark Complete
                              </Button>
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
                              <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(li.price)}/unit</Text>
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
