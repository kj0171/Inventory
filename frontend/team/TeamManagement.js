'use client'

import { useState, useEffect, useCallback } from 'react'
import { ROLES, useAuth } from '../shared/auth'
import { userService } from '../../backend'
import {
  Table, Button, Modal, TextInput, PasswordInput, Select, Badge, Group, Stack,
  Title, Text, Card, ActionIcon, Loader, Center, Alert, SimpleGrid, Divider, Box
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

const ROLE_OPTIONS = [
  { value: ROLES.SALESPERSON, label: 'Sales' },
  { value: ROLES.DISPATCHER, label: 'Dispatch' },
  { value: ROLES.ADMIN, label: 'Admin' },
]

const ROLE_COLORS = {
  [ROLES.ADMIN]: 'red',
  [ROLES.SALESPERSON]: 'blue',
  [ROLES.DISPATCHER]: 'orange',
}

export default function TeamManagement() {
  const { user } = useAuth()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', role: ROLES.SALESPERSON })

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    const { data, error } = await userService.getAll()
    if (!error && data) setEmployees(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) return

    setSubmitting(true)
    setFormError('')

    try {
      const { data, error } = await userService.createUser({
        email: form.email.trim(),
        password: form.password.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        role: form.role,
      }, user)

      if (error) {
        setFormError(error.message)
        return
      }

      setForm({ full_name: '', email: '', password: '', phone: '', role: ROLES.SALESPERSON })
      setShowForm(false)
      fetchEmployees()
    } catch (err) {
      setFormError(err.message || 'Failed to add employee')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    const { error } = await userService.deleteUser(id)
    if (error) {
      alert('Failed to remove: ' + error.message)
      return
    }
    setEmployees(prev => prev.filter(emp => emp.id !== id))
  }

  const isAdmin = user?.profile?.role === ROLES.ADMIN
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Team Members</Title>
          <Text size="sm" c="dimmed">{employees.length} employee{employees.length !== 1 ? 's' : ''}</Text>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowForm(true)}>+ Add Employee</Button>
        )}
      </Group>

      {/* Add Employee Modal */}
      <Modal opened={showForm} onClose={() => setShowForm(false)} title="Add New Employee" centered size="md">
        <form onSubmit={handleAdd}>
          <Stack gap="md">
            {formError && <Alert color="red" variant="light">{formError}</Alert>}
            <TextInput
              label="Full Name"
              placeholder="Enter full name"
              value={form.full_name}
              onChange={e => handleChange('full_name', e.target.value)}
              required
              autoFocus
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Email"
                placeholder="Enter email"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="Set initial password"
                value={form.password}
                onChange={e => handleChange('password', e.target.value)}
                required
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Phone"
                placeholder="Phone number (optional)"
                type="tel"
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
              />
              <Select
                label="Role"
                data={ROLE_OPTIONS}
                value={form.role}
                onChange={val => handleChange('role', val)}
                allowDeselect={false}
              />
            </SimpleGrid>
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>Add Employee</Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Employee List */}
      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : employees.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Text c="dimmed">No employees added yet. Click &quot;Add Employee&quot; to get started.</Text>
        </Card>
      ) : isMobile ? (
        /* Mobile: Card layout */
        <Stack gap="sm">
          {employees.map(emp => (
            <Card key={emp.id} withBorder radius="md" padding="md">
              <Group justify="space-between" align="flex-start" mb="xs">
                <div>
                  <Text fw={600} size="sm">{emp.full_name}</Text>
                  <Text size="xs" c="dimmed">{emp.phone || 'No phone'}</Text>
                </div>
                <Badge color={ROLE_COLORS[emp.role] || 'gray'} variant="light" size="sm">{emp.role}</Badge>
              </Group>
              {isAdmin && (
                <Button size="compact-xs" color="red" variant="subtle" mt="xs" onClick={() => handleRemove(emp.id)}>
                  Remove
                </Button>
              )}
            </Card>
          ))}
        </Stack>
      ) : (
        /* Desktop: Table layout */
        <Card withBorder p={0} radius="md" style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Phone</Table.Th>
                <Table.Th>Role</Table.Th>
                {isAdmin && <Table.Th>Actions</Table.Th>}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {employees.map(emp => (
                <Table.Tr key={emp.id}>
                  <Table.Td fw={600}>{emp.full_name}</Table.Td>
                  <Table.Td>{emp.phone || '—'}</Table.Td>
                  <Table.Td>
                    <Badge color={ROLE_COLORS[emp.role] || 'gray'} variant="light">{emp.role}</Badge>
                  </Table.Td>
                  {isAdmin && (
                    <Table.Td>
                      <Button size="compact-xs" color="red" variant="subtle" onClick={() => handleRemove(emp.id)}>
                        Remove
                      </Button>
                    </Table.Td>
                  )}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  )
}
