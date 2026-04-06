'use client'

import { useState, useEffect, useCallback } from 'react'
import { customerService } from '../../backend'
import {
  Table, Button, Modal, TextInput, Group, Stack,
  Title, Text, Card, Badge, Loader, Center, Alert, SimpleGrid, Divider
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

export default function CustomerManagement() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', mobile: '', email: '', gst_number: '', address: '' })
  const [search, setSearch] = useState('')
  const isMobile = useMediaQuery('(max-width: 768px)')

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await customerService.getAll()
    if (!error && data) setCustomers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  function openAdd() {
    setEditingCustomer(null)
    setForm({ name: '', mobile: '', email: '', gst_number: '', address: '' })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(customer) {
    setEditingCustomer(customer)
    setForm({
      name: customer.name || '',
      mobile: customer.mobile || '',
      email: customer.email || '',
      gst_number: customer.gst_number || '',
      address: customer.address || '',
    })
    setFormError('')
    setShowForm(true)
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.mobile.trim()) {
      setFormError('Name and mobile are required')
      return
    }

    setSubmitting(true)
    setFormError('')

    try {
      if (editingCustomer) {
        const { error } = await customerService.update(editingCustomer.id, {
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          gst_number: form.gst_number.trim() || null,
          address: form.address.trim() || null,
        })
        if (error) { setFormError(error.message); return }
      } else {
        const { error } = await customerService.create({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          gst_number: form.gst_number.trim() || null,
          address: form.address.trim() || null,
        })
        if (error) { setFormError(error.message); return }
      }

      setShowForm(false)
      setEditingCustomer(null)
      fetchCustomers()
    } catch (err) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this customer?')) return
    const { error } = await customerService.remove(id)
    if (error) {
      alert('Failed to remove: ' + error.message)
      return
    }
    setCustomers(prev => prev.filter(c => c.id !== id))
  }

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name?.toLowerCase().includes(q) || c.mobile?.includes(q) || c.email?.toLowerCase().includes(q)
  })

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Customers</Title>
          <Text size="sm" c="dimmed">{filtered.length} of {customers.length} customer{customers.length !== 1 ? 's' : ''}</Text>
        </div>
        <Button onClick={openAdd}>+ Add Customer</Button>
      </Group>

      <TextInput
        placeholder="Search by name, mobile or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Add/Edit Customer Modal */}
      <Modal
        opened={showForm}
        onClose={() => setShowForm(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        centered
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {formError && <Alert color="red" variant="light">{formError}</Alert>}
            <TextInput
              label="Name"
              placeholder="Customer name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              autoFocus
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Mobile"
                placeholder="Mobile number"
                type="tel"
                value={form.mobile}
                onChange={e => handleChange('mobile', e.target.value)}
                required
              />
              <TextInput
                label="Email"
                placeholder="Email (optional)"
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
              />
            </SimpleGrid>
            <TextInput
              label="GST Number"
              placeholder="GST number (optional)"
              value={form.gst_number}
              onChange={e => handleChange('gst_number', e.target.value)}
            />
            <TextInput
              label="Address"
              placeholder="Address (optional)"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
            />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>
                {editingCustomer ? 'Update' : 'Add Customer'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Customer List */}
      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : customers.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Text c="dimmed">No customers added yet. Click &quot;Add Customer&quot; to get started.</Text>
        </Card>
      ) : isMobile ? (
        /* Mobile: Card layout */
        <Stack gap="sm">
          {filtered.map(cust => (
            <Card key={cust.id} withBorder radius="md" padding="md">
              <Group justify="space-between" align="flex-start" mb={4}>
                <Text fw={600} size="sm">{cust.name}</Text>
              </Group>
              <Stack gap={4}>
                <Group gap="xs">
                  <Text size="xs" c="dimmed" w={55}>Mobile</Text>
                  <Text size="xs">{cust.mobile || '—'}</Text>
                </Group>
                {cust.email && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={55}>Email</Text>
                    <Text size="xs">{cust.email}</Text>
                  </Group>
                )}
                {cust.gst_number && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={55}>GST</Text>
                    <Text size="xs">{cust.gst_number}</Text>
                  </Group>
                )}
                {cust.address && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={55}>Address</Text>
                    <Text size="xs">{cust.address}</Text>
                  </Group>
                )}
              </Stack>
              <Group gap="xs" mt="xs">
                <Button size="compact-xs" variant="subtle" onClick={() => openEdit(cust)}>Edit</Button>
                <Button size="compact-xs" color="red" variant="subtle" onClick={() => handleRemove(cust.id)}>Remove</Button>
              </Group>
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
                <Table.Th>Mobile</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>GST Number</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(cust => (
                <Table.Tr key={cust.id}>
                  <Table.Td fw={600}>{cust.name}</Table.Td>
                  <Table.Td>{cust.mobile || '—'}</Table.Td>
                  <Table.Td>{cust.email || '—'}</Table.Td>
                  <Table.Td>{cust.gst_number || '—'}</Table.Td>
                  <Table.Td>{cust.address || '—'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="compact-xs" variant="subtle" onClick={() => openEdit(cust)}>Edit</Button>
                      <Button size="compact-xs" color="red" variant="subtle" onClick={() => handleRemove(cust.id)}>Remove</Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      )}
    </Stack>
  )
}
