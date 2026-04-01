import { ActionIcon, Button, Group, Paper, Select, SimpleGrid, Stack, TextInput } from '@mantine/core'

export default function Filters({ filters, uniqueCategories, uniqueItemGroups, onFilterChange, onClearFilters, onExport }) {
  return (
    <Paper p="md" radius="md" withBorder mb="md">
      <Stack gap="sm">
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={onClearFilters}>Clear All</Button>
          <Button size="xs" onClick={onExport}>Export CSV</Button>
        </Group>

        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }}>
          <TextInput
            placeholder="Search by item name..."
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
            placeholder="All Item Groups"
            data={[{ value: 'all', label: 'All Item Groups' }, ...uniqueItemGroups.map(g => ({ value: g, label: g }))]}
            value={filters.itemGroup}
            onChange={(val) => onFilterChange('itemGroup', val || 'all')}
            allowDeselect={false}
          />
          <Select
            placeholder="All Levels"
            data={[
              { value: 'all', label: 'All Levels' },
              { value: 'low', label: 'Low (< 10)' },
              { value: 'medium', label: 'Medium (10-50)' },
              { value: 'high', label: 'High (> 50)' },
            ]}
            value={filters.stockLevel}
            onChange={(val) => onFilterChange('stockLevel', val || 'all')}
            allowDeselect={false}
          />
          <Select
            placeholder="All Ages"
            data={[
              { value: 'all', label: 'All Ages' },
              { value: '15', label: '> 15 Days' },
              { value: '30', label: '> 30 Days' },
              { value: '60', label: '> 60 Days' },
              { value: '90', label: '> 90 Days' },
              { value: '120', label: '> 120 Days' },
            ]}
            value={filters.ageFilter}
            onChange={(val) => onFilterChange('ageFilter', val || 'all')}
            allowDeselect={false}
          />
          <Group gap={4} wrap="nowrap">
            <Select
              placeholder="Sort By"
              data={[
                { value: 'date', label: 'Date' },
                { value: 'name', label: 'Name' },
                { value: 'category', label: 'Category' },
                { value: 'itemGroup', label: 'Item Group' },
                { value: 'quantity', label: 'Quantity' },
              ]}
              value={filters.sortBy}
              onChange={(val) => onFilterChange('sortBy', val || 'date')}
              allowDeselect={false}
              style={{ flex: 1 }}
            />
            <ActionIcon
              variant="default"
              size="lg"
              onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </ActionIcon>
          </Group>
        </SimpleGrid>
      </Stack>
    </Paper>
  )
}
