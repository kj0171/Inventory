'use client'

import { useState, useMemo, Fragment } from 'react'
import {
  Badge, Button, Card, Center, Collapse, Group, Loader,
  Paper, SimpleGrid, Stack, Table, Text, TextInput
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { formatDate } from '../shared/utils'
import { getUnitsForItem, registerUnits } from '../shared/unitStore'
import ScannerInput from '../shared/ScannerInput'

const STATUS_COLOR = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  dispatched: 'blue',
}

export default function DispatchDashboard({ orders, loading, onDispatch }) {
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('approved')
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
        const itemNames = (order.sales_order_items || [])
          .map(li => li.inventory_items?.name || '').join(' ').toLowerCase()
        if (
          !itemNames.includes(search) &&
          !order.customer_name?.toLowerCase().includes(search) &&
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
      {/* Stat cards as filters */}
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

      {/* Filters — single row */}
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

      {/* Order List */}
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
          /* Mobile cards */
          <Stack gap="sm">
            {filteredOrders.map(order => {
              const items = order.sales_order_items || []
              const isExpanded = expandedOrders[order.id]
              return (
                <Card key={order.id} padding="sm" radius="md" withBorder
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleExpand(order.id)}
                >
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text fw={600}>{order.customer_name}</Text>
                      <Text size="xs" c="dimmed">#{order.id}</Text>
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
                  </SimpleGrid>

                  <Collapse expanded={isExpanded}>
                    <Stack gap="xs" mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => (
                        <DispatchLineItem key={li.id} lineItem={li} orderStatus={order.status} />
                      ))}
                    </Stack>
                  </Collapse>

                  {order.status === 'approved' && (
                    <Group mt="xs" onClick={(e) => e.stopPropagation()}>
                      <Button size="xs" color="blue" onClick={() => onDispatch(order.id)}>Mark Dispatched</Button>
                    </Group>
                  )}
                  {order.status === 'dispatched' && (
                    <Badge mt="xs" variant="light" color="green">Completed</Badge>
                  )}
                </Card>
              )
            })}
          </Stack>
        ) : (
          /* Desktop table */
          <Table.ScrollContainer minWidth={700}>
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Order ID</Table.Th>
                  <Table.Th>Customer</Table.Th>
                  <Table.Th>Items</Table.Th>
                  <Table.Th>Total Qty</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Approved On</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredOrders.map(order => {
                  const items = order.sales_order_items || []
                  const isExpanded = expandedOrders[order.id]
                  return (
                    <Fragment key={order.id}>
                      <Table.Tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleExpand(order.id)}
                      >
                        <Table.Td>
                          <Text size="sm" fw={500} c="blue">#{order.id}</Text>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>{order.customer_name}</Text>
                            {order.customer_contact && (
                              <Text size="xs" c="dimmed">{order.customer_contact}</Text>
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
                          <Badge variant="light">{getTotalQty(items)} units</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color={STATUS_COLOR[order.status] || 'gray'}>{order.status}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{formatDate(order.updated_at)}</Text>
                        </Table.Td>
                        <Table.Td onClick={(e) => e.stopPropagation()}>
                          {order.status === 'approved' && (
                            <Button size="xs" color="blue" onClick={() => onDispatch(order.id)}>Mark Dispatched</Button>
                          )}
                          {order.status === 'dispatched' && (
                            <Badge variant="light" color="green">Completed</Badge>
                          )}
                        </Table.Td>
                      </Table.Tr>
                      {isExpanded && items.map(li => (
                        <Table.Tr key={li.id} style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                          <Table.Td />
                          <Table.Td colSpan={2}>
                            <Group gap="xs">
                              <Text size="sm">{li.inventory_items?.name || 'Unknown'}</Text>
                              {li.inventory_items?.item_category && (
                                <Badge variant="dot" size="sm">{li.inventory_items.item_category}</Badge>
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td colSpan={4}>
                            <DispatchLineItem lineItem={li} orderStatus={order.status} />
                          </Table.Td>
                        </Table.Tr>
                      ))}
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

function DispatchLineItem({ lineItem, orderStatus }) {
  const itemId = lineItem.item_id || lineItem.inventory_items?.id
  const units = itemId ? getUnitsForItem(itemId) : []
  const availableUnits = units.filter(u => u.status === 'available')
  const needed = lineItem.quantity
  const [scannedForDispatch, setScannedForDispatch] = useState([])

  function handleScan(barcodes) {
    setScannedForDispatch(prev => [...prev, ...barcodes])
    // Also register them if they're new
    if (itemId) registerUnits(itemId, barcodes)
  }

  if (orderStatus === 'dispatched') {
    return (
      <Group gap="xs">
        <Badge variant="light" size="sm">{needed} units</Badge>
        <Badge variant="light" color="green" size="sm">✓ Dispatched</Badge>
      </Group>
    )
  }

  const tagged = scannedForDispatch.length

  return (
    <Stack gap="xs" onClick={e => e.stopPropagation()}>
      <Group gap="xs">
        <Badge variant="light" size="sm">{needed} units needed</Badge>
        {tagged > 0 && (
          <Badge variant="light" color="green" size="sm">{tagged}/{needed} scanned</Badge>
        )}
        {availableUnits.length > 0 && (
          <Badge variant="light" color="blue" size="xs">{availableUnits.length} pre-registered</Badge>
        )}
      </Group>
      {tagged < needed && (
        <ScannerInput
          remaining={needed - tagged}
          registered={tagged}
          onRegister={handleScan}
          autoFocus={false}
        />
      )}
      {tagged >= needed && (
        <Badge color="green" variant="light" size="sm">✓ All units scanned</Badge>
      )}
    </Stack>
  )
}
