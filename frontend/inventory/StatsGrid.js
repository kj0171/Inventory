import { Paper, SimpleGrid, Text, UnstyledButton } from '@mantine/core'

export default function StatsGrid({ filteredCount, totalStock, categoriesCount, lowStock, activeFilter, onStatClick }) {
  const stats = [
    { key: 'all', label: 'Total Items', value: filteredCount, color: 'blue' },
    { key: 'all', label: 'Total Stock', value: totalStock, color: 'green' },
    { key: 'all', label: 'Categories', value: categoriesCount, color: 'violet' },
    { key: 'low', label: 'Low Stock', value: lowStock, color: 'red' },
  ]

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
      {stats.map(s => {
        const isActive = activeFilter === s.key && s.key !== 'all'
        return (
          <UnstyledButton key={s.label} onClick={() => onStatClick(s.key)}>
            <Paper
              p="md"
              radius="md"
              withBorder
              style={{
                cursor: 'pointer',
                borderColor: isActive ? `var(--mantine-color-${s.color}-5)` : undefined,
                borderWidth: isActive ? 2 : 1,
                transition: 'all 150ms ease',
              }}
            >
              <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{s.label}</Text>
              <Text size="xl" fw={700} c={s.color}>{s.value}</Text>
            </Paper>
          </UnstyledButton>
        )
      })}
    </SimpleGrid>
  )
}
