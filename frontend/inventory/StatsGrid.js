import { Paper, SimpleGrid, Text } from '@mantine/core'

export default function StatsGrid({ filteredCount, totalStock, categoriesCount, lowStock }) {
  const stats = [
    { label: 'Filtered Items', value: filteredCount, color: 'blue' },
    { label: 'Total Stock', value: totalStock, color: 'green' },
    { label: 'Categories', value: categoriesCount, color: 'violet' },
    { label: 'Low Stock Alert', value: lowStock, color: 'red' },
  ]

  return (
    <SimpleGrid cols={{ base: 2, sm: 4 }} mb="md">
      {stats.map(s => (
        <Paper key={s.label} p="md" radius="md" withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{s.label}</Text>
          <Text size="xl" fw={700} c={s.color}>{s.value}</Text>
        </Paper>
      ))}
    </SimpleGrid>
  )
}
