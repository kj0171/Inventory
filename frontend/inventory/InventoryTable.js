'use client'

import { Paper, Group, Text, Button, Badge, Table, Box, NumberInput, ActionIcon, Card, SimpleGrid, Stack } from '@mantine/core'
import { getCategoryColor, getQuantityColor, formatDate, formatDateShort } from '../shared/utils'

function QuantityBadge({ qty }) {
  return <Badge variant="light" color={getQuantityColor(qty)} size="sm">{qty}</Badge>
}

function CategoryBadge({ category }) {
  const { bg, color } = getCategoryColor(category)
  return (
    <Badge size="xs" tt="uppercase" styles={{ root: { background: bg, color, fontWeight: 500 } }}>
      {category}
    </Badge>
  )
}

function InlineCartControl({ available, cartQty, onAdd }) {
  if (available <= 0) return <Text size="xs" c="dimmed">Out of stock</Text>
  if (cartQty > 0) {
    return (
      <Group gap={4} wrap="nowrap">
        <ActionIcon size="xs" variant="filled" color="green" onClick={() => onAdd(Math.max(0, cartQty - 1))}>−</ActionIcon>
        <Text size="xs" fw={700} w={20} ta="center">{cartQty}</Text>
        <ActionIcon size="xs" variant="filled" color="green" onClick={() => onAdd(Math.min(available, cartQty + 1))} disabled={cartQty >= available}>+</ActionIcon>
      </Group>
    )
  }
  return (
    <Button size="compact-xs" variant="light" onClick={() => onAdd(1)}>
      + Cart
    </Button>
  )
}

function SortHeader({ label, field, sortBy, sortOrder, onSort }) {
  const active = sortBy === field
  return (
    <Table.Th
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onSort(field)}
    >
      <Group gap={4} wrap="nowrap">
        {label}
        {active && <Text size="xs" c="blue" component="span">{sortOrder === 'asc' ? '↑' : '↓'}</Text>}
      </Group>
    </Table.Th>
  )
}

/* ==================== Desktop Table ==================== */
function DesktopView({ rows, getCartQty, onAddToCart, sortBy, sortOrder, onSort }) {
  return (
    <Box visibleFrom="sm" style={{ overflowX: 'auto' }}>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <SortHeader label="Item Name" field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <Table.Th>Category</Table.Th>
            <Table.Th>Brand</Table.Th>
            <SortHeader label="Stock" field="quantity" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <Table.Th>Blocked</Table.Th>
            <Table.Th>Available</Table.Th>
            <SortHeader label="Updated" field="date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <Table.Th>Cart</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const avail = row.quantity - (row.blocked_qty || 0)
            const isLow = avail > 0 && avail < 10
            return (
              <Table.Tr key={row.id} bg={isLow ? 'red.0' : undefined}>
                <Table.Td>
                  <Text fw={600} size="sm">{row.inventory_items?.name || 'Unknown'}</Text>
                </Table.Td>
                <Table.Td><CategoryBadge category={row.inventory_items?.item_category || 'Other'} /></Table.Td>
                <Table.Td><Badge variant="light" color="blue" size="xs">{row.inventory_items?.item_group || 'N/A'}</Badge></Table.Td>
                <Table.Td><QuantityBadge qty={row.quantity} /></Table.Td>
                <Table.Td><Badge variant="light" color="red" size="sm">{row.blocked_qty || 0}</Badge></Table.Td>
                <Table.Td><QuantityBadge qty={avail} /></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{formatDate(row.created_at)}</Text></Table.Td>
                <Table.Td>
                  <InlineCartControl
                    available={avail}
                    cartQty={getCartQty(row.id)}
                    onAdd={(qty) => onAddToCart(row, qty)}
                  />
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Box>
  )
}

/* ==================== Mobile Cards ==================== */
function MobileView({ rows, getCartQty, onAddToCart }) {
  return (
    <Box hiddenFrom="sm">
      <Stack gap="xs">
        {rows.map((row) => {
          const avail = row.quantity - (row.blocked_qty || 0)
          const isLow = avail > 0 && avail < 10
          return (
            <Card key={row.id} shadow="xs" radius="sm" p="sm" withBorder bg={isLow ? 'red.0' : undefined}>
              <Group justify="space-between" mb="xs" wrap="nowrap">
                <Box style={{ minWidth: 0 }}>
                  <Text fw={600} size="sm" truncate>{row.inventory_items?.name || 'Unknown'}</Text>
                  <Group gap={4} mt={2}>
                    <CategoryBadge category={row.inventory_items?.item_category || 'Other'} />
                    <Badge variant="light" color="blue" size="xs">{row.inventory_items?.item_group || 'N/A'}</Badge>
                  </Group>
                </Box>
                <InlineCartControl
                  available={avail}
                  cartQty={getCartQty(row.id)}
                  onAdd={(qty) => onAddToCart(row, qty)}
                />
              </Group>
              <SimpleGrid cols={3} spacing="xs">
                <Box>
                  <Text size="xs" c="dimmed" fw={600}>Stock</Text>
                  <QuantityBadge qty={row.quantity} />
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={600}>Blocked</Text>
                  <Badge variant="light" color="red" size="sm">{row.blocked_qty || 0}</Badge>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={600}>Avail</Text>
                  <QuantityBadge qty={avail} />
                </Box>
              </SimpleGrid>
            </Card>
          )
        })}
      </Stack>
    </Box>
  )
}

/* ==================== Main ==================== */
export default function InventoryTable({
  filteredData, data, onAddToCart, cartItems, sortBy, sortOrder, onSort, onExport
}) {
  function getCartQty(stockId) {
    const item = (cartItems || []).find(c => c.inventory_stock_id === stockId)
    return item ? item.quantity : 0
  }

  return (
    <Paper shadow="sm" radius="md" withBorder style={{ overflow: 'hidden' }}>
      <Group justify="space-between" p="md" style={{ background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', borderBottom: '2px solid #e9ecef' }}>
        <Text fw={600} size="lg">
          Inventory <Text component="span" size="sm" c="dimmed" fw={400}>({filteredData.length} of {data.length} items)</Text>
        </Text>
        {filteredData.length > 0 && onExport && (
          <Button size="compact-xs" variant="light" onClick={onExport}>📥 Export CSV</Button>
        )}
      </Group>

      {filteredData.length === 0 ? (
        <Box ta="center" py={60} px="lg">
          <Text fw={500} size="lg" c="dimmed" mb="xs">
            {data.length === 0 ? 'No inventory data found' : 'No items match your filters'}
          </Text>
          <Text size="sm" c="dimmed">
            {data.length === 0 ? 'Start by adding some items to your inventory.' : 'Try adjusting your filters to see more results.'}
          </Text>
        </Box>
      ) : (
        <Box p={{ base: 'xs', sm: 'md' }}>
          <DesktopView
            rows={filteredData}
            getCartQty={getCartQty}
            onAddToCart={onAddToCart}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={onSort}
          />
          <MobileView
            rows={filteredData}
            getCartQty={getCartQty}
            onAddToCart={onAddToCart}
          />
        </Box>
      )}
    </Paper>
  )
}
