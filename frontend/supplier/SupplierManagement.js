'use client'

import { useState, useEffect, useCallback } from 'react'
import { supplierService } from '../../backend'
import {
  Table, Button, Modal, TextInput, Textarea, Group, Stack,
  Title, Text, Card, Loader, Center, Alert, SimpleGrid, Divider
} from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', firm_name: '', mobile: '', email: '', gst_number: '', address: '' })
  const [search, setSearch] = useState('')
  const isMobile = useMediaQuery('(max-width: 768px)')

  const fetchSuppliers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supplierService.getAll()
    if (!error && data) setSuppliers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

  function openAdd() {
    setEditingSupplier(null)
    setForm({ name: '', firm_name: '', mobile: '', email: '', gst_number: '', address: '' })
    setFormError('')
    setShowForm(true)
  }

  function openEdit(supplier) {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name || '',
      firm_name: supplier.firm_name || '',
      mobile: supplier.mobile || '',
      email: supplier.email || '',
      gst_number: supplier.gst_number || '',
      address: supplier.address || '',
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
      if (editingSupplier) {
        const { error } = await supplierService.update(editingSupplier.id, {
          name: form.name.trim(),
          firm_name: form.firm_name.trim() || null,
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          gst_number: form.gst_number.trim() || null,
          address: form.address.trim() || null,
        })
        if (error) { setFormError(error.message); return }
      } else {
        const { error } = await supplierService.create({
          name: form.name.trim(),
          firm_name: form.firm_name.trim() || null,
          mobile: form.mobile.trim(),
          email: form.email.trim() || null,
          gst_number: form.gst_number.trim() || null,
          address: form.address.trim() || null,
        })
        if (error) { setFormError(error.message); return }
      }

      setShowForm(false)
      setEditingSupplier(null)
      fetchSuppliers()
    } catch (err) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemove(id) {
    if (!confirm('Remove this supplier?')) return
    const { error } = await supplierService.remove(id)
    if (error) {
      alert('Failed to remove: ' + error.message)
      return
    }
    setSuppliers(prev => prev.filter(s => s.id !== id))
  }

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    return !q || s.name?.toLowerCase().includes(q) || s.firm_name?.toLowerCase().includes(q) || s.mobile?.includes(q) || s.email?.toLowerCase().includes(q)
  })

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Suppliers</Title>
          <Text size="sm" c="dimmed">{filtered.length} of {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''}</Text>
        </div>
        <Button onClick={openAdd}>+ Add Supplier</Button>
      </Group>

      <TextInput
        placeholder="Search by name, firm, mobile or email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {/* Add/Edit Supplier Modal */}
      <Modal
        opened={showForm}
        onClose={() => setShowForm(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        centered
        size="md"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {formError && <Alert color="red" variant="light">{formError}</Alert>}
            <TextInput
              label="Name"
              placeholder="Contact person name"
              value={form.name}
              onChange={e => handleChange('name', e.target.value)}
              required
              autoFocus
            />
            <Textarea
              label="Firm Name"
              placeholder="Firm / company name"
              value={form.firm_name}
              onChange={e => handleChange('firm_name', e.target.value)}
              autosize
              minRows={1}
              maxRows={3}
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
            <Textarea
              label="Address"
              placeholder="Address (optional)"
              value={form.address}
              onChange={e => handleChange('address', e.target.value)}
              autosize
              minRows={1}
              maxRows={4}
            />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>
                {editingSupplier ? 'Update' : 'Add Supplier'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Supplier List */}
      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : suppliers.length === 0 ? (
        <Card withBorder p="xl" ta="center">
          <Text c="dimmed">No suppliers added yet. Click &quot;Add Supplier&quot; to get started.</Text>
        </Card>
      ) : isMobile ? (
        /* Mobile: Card layout */
        <Stack gap="sm">
          {filtered.map(sup => (
            <Card key={sup.id} withBorder radius="md" padding="md">
              <Group justify="space-between" align="flex-start" mb={4}>
                <div>
                  <Text fw={600} size="sm">{sup.name}</Text>
                  {sup.firm_name && <Text size="xs" c="dimmed">{sup.firm_name}</Text>}
                </div>
              </Group>
              <Stack gap={4}>
                <Group gap="xs">
                  <Text size="xs" c="dimmed" w={55}>Mobile</Text>
                  <Text size="xs">{sup.mobile || '—'}</Text>
                </Group>
                {sup.email && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={55}>Email</Text>
                    <Text size="xs">{sup.email}</Text>
                  </Group>
                )}
                {sup.gst_number && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={55}>GST</Text>
                    <Text size="xs">{sup.gst_number}</Text>
                  </Group>
                )}
                {sup.address && (
                  <Group gap="xs">
                    <Text size="xs" c="dimmed" w={55}>Address</Text>
                    <Text size="xs">{sup.address}</Text>
                  </Group>
                )}
              </Stack>
              <Group gap="xs" mt="xs">
                <Button size="compact-xs" variant="subtle" onClick={() => openEdit(sup)}>Edit</Button>
                <Button size="compact-xs" color="red" variant="subtle" onClick={() => handleRemove(sup.id)}>Remove</Button>
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
                <Table.Th>Firm Name</Table.Th>
                <Table.Th>Mobile</Table.Th>
                <Table.Th>Email</Table.Th>
                <Table.Th>GST Number</Table.Th>
                <Table.Th>Address</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filtered.map(sup => (
                <Table.Tr key={sup.id}>
                  <Table.Td fw={600}>{sup.name}</Table.Td>
                  <Table.Td>{sup.firm_name || '—'}</Table.Td>
                  <Table.Td>{sup.mobile || '—'}</Table.Td>
                  <Table.Td>{sup.email || '—'}</Table.Td>
                  <Table.Td>{sup.gst_number || '—'}</Table.Td>
                  <Table.Td>{sup.address || '—'}</Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button size="compact-xs" variant="subtle" onClick={() => openEdit(sup)}>Edit</Button>
                      <Button size="compact-xs" color="red" variant="subtle" onClick={() => handleRemove(sup.id)}>Remove</Button>
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
