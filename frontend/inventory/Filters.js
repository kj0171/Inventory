import { Button, Group, Paper, Select, SimpleGrid, Stack, TextInput } from '@mantine/core'

export default function Filters({ filters, uniqueCategories, uniqueBrands, onFilterChange, onClearFilters }) {
  const hasFilters = filters.search || filters.category !== 'all' || filters.brand !== 'all' || filters.stockLevel !== 'all'

  return (
    <Paper p="md" radius="md" withBorder mb="md">
      <Stack gap="sm">
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <TextInput
            placeholder="Search items..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.currentTarget.value)}
          />
          <Select
            placeholder="All Categories"
            data={[{ value: 'all', label: 'All Categories' }, ...uniqueCategories.map(c => ({ value: c, label: c }))]}
            value={filters.category}
            onChange={(val) => onFilterChange('category', val || 'all')}
            allowDeselect={false}
          />
          <Select
            placeholder="All Brands"
            data={[{ value: 'all', label: 'All Brands' }, ...(uniqueBrands || []).map(b => ({ value: b, label: b }))]}
            value={filters.brand}
            onChange={(val) => onFilterChange('brand', val || 'all')}
            allowDeselect={false}
          />
          <Select
            placeholder="All Levels"
            data={[
              { value: 'all', label: 'All Stock Levels' },
              { value: 'low', label: 'Low (< 10)' },
              { value: 'medium', label: 'Medium (10-50)' },
              { value: 'high', label: 'High (> 50)' },
            ]}
            value={filters.stockLevel}
            onChange={(val) => onFilterChange('stockLevel', val || 'all')}
            allowDeselect={false}
          />
        </SimpleGrid>

        {hasFilters && (
          <Group justify="flex-end">
            <Button variant="subtle" size="xs" color="red" onClick={onClearFilters}>Clear Filters</Button>
          </Group>
        )}
      </Stack>
    </Paper>
  )
}
