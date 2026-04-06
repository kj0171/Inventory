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
  approved: 'green',
  rejected: 'red',
  dispatched: 'blue',
}

export default function SalesOrderDashboard({ orders, loading, onApprove, onReject }) {
  const [statusFilter, setStatusFilter] = useState('pending')
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
        const itemNames = (order.sales_order_items || [])
          .map(li => li.inventory_items?.name || '').join(' ').toLowerCase()
        if (
          !itemNames.includes(search) &&
          !order.customer_name?.toLowerCase().includes(search) &&
          !String(order.id).includes(search)
        ) return false
      }
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(order.created_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(order.created_at) > to) return false
      }
      return true
    })
  }, [orders, statusFilter, searchFilter, dateFrom, dateTo])

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    approved: orders.filter(o => o.status === 'approved').length,
    dispatched: orders.filter(o => o.status === 'dispatched').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
  }), [orders])

  const { user } = useAuth()
  const isAdmin = user?.profile?.role === ROLES.ADMIN

  function renderItemsSummary(items) {
    if (!items || items.length === 0) return 'No items'
    if (items.length === 1) return items[0].inventory_items?.name || 'Unknown'
    return `${items[0].inventory_items?.name || 'Unknown'} +${items.length - 1} more`
  }

  function getTotalQty(items) {
    return (items || []).reduce((sum, li) => sum + li.quantity, 0)
  }

  const statCards = [
    { label: 'All Orders', value: stats.total, color: 'blue', filter: 'all' },
    { label: 'Pending', value: stats.pending, color: 'yellow', filter: 'pending' },
    { label: 'Approved', value: stats.approved, color: 'green', filter: 'approved' },
    { label: 'Rejected', value: stats.rejected, color: 'red', filter: 'rejected' },
    { label: 'Dispatched', value: stats.dispatched, color: 'cyan', filter: 'dispatched' },
  ]

  return (
    <Stack gap="md">
      {/* Stat cards as filters */}
      <SimpleGrid cols={{ base: 3, sm: 5 }}>
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
          onChange={(e) => setSearchFilter(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <TextInput size="sm" type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.currentTarget.value)} w={140} />
        <TextInput size="sm" type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.currentTarget.value)} w={140} />
        {(dateFrom || dateTo || searchFilter) && (
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
              <Text fw={500} size="lg">No sales orders found</Text>
              <Text c="dimmed" size="sm">Create a sale from the Inventory tab to get started.</Text>
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
                    <div>
                      <Text size="xs" c="dimmed">Created</Text>
                      <Text size="sm">{formatDate(order.created_at)}</Text>
                    </div>
                  </SimpleGrid>

                  <Collapse in={isExpanded}>
                    <Stack gap={4} mt="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)', paddingTop: 8 }}>
                      {items.map(li => (
                        <Group key={li.id} justify="space-between">
                          <Text size="sm">{li.inventory_items?.name || 'Unknown'}</Text>
                          <Badge variant="light" size="sm">{li.quantity} units</Badge>
                        </Group>
                      ))}
                    </Stack>
                  </Collapse>

                  {isAdmin && order.status === 'pending' && (
                    <Group mt="xs" onClick={(e) => e.stopPropagation()}>
                      <Button size="xs" color="green" onClick={() => onApprove(order.id)}>Approve</Button>
                      <Button size="xs" color="red" variant="light" onClick={() => onReject(order.id)}>Reject</Button>
                    </Group>
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
                  <Table.Th>Created</Table.Th>
                  {isAdmin && <Table.Th>Actions</Table.Th>}
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
                          <Text size="sm" c="dimmed">{formatDate(order.created_at)}</Text>
                        </Table.Td>
                        {isAdmin && (
                          <Table.Td onClick={(e) => e.stopPropagation()}>
                            {order.status === 'pending' && (
                              <Group gap="xs">
                                <Button size="xs" color="green" onClick={() => onApprove(order.id)}>Approve</Button>
                                <Button size="xs" color="red" variant="light" onClick={() => onReject(order.id)}>Reject</Button>
                              </Group>
                            )}
                          </Table.Td>
                        )}
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
                          <Table.Td>
                            <Badge variant="light" size="sm">{li.quantity} units</Badge>
                          </Table.Td>
                          <Table.Td colSpan={isAdmin ? 3 : 2} />
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
