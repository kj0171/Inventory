'use client'

import { useState } from 'react'
import {
  ActionIcon, Badge, Divider, Drawer, Group, Stack, Text, TextInput
} from '@mantine/core'
import { formatDate } from './utils'

/**
 * Shared BarcodeDrawer — opened from any flow to view/edit/delete/add barcodes for an item.
 *
 * Props:
 *   opened      – boolean
 *   onClose     – () => void
 *   title       – drawer title (item name)
 *   barcodes    – array of { id, barcode, created_at }
 *   onUpdate    – (barcodeId, newValue) => void   (omit for read-only)
 *   onDelete    – (barcodeId) => void              (omit for read-only)
 *   onAdd       – (identifier: string) => void     (omit to hide add input)
 *   badgeLabel  – optional label for the count badge, e.g. "registered" / "scanned"
 */

function BarcodeRow({ entry, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(entry.barcode)
  const editable = !!onUpdate

  function handleSave() {
    const trimmed = value.trim()
    if (trimmed && trimmed !== entry.barcode) {
      onUpdate(entry.id, trimmed)
    }
    setEditing(false)
  }

  return (
    <Group gap="xs" justify="space-between" wrap="nowrap"
      style={{ borderBottom: '1px solid var(--mantine-color-gray-2)', paddingBottom: 6 }}
    >
      {editing ? (
        <TextInput
          size="xs"
          value={value}
          onChange={e => setValue(e.currentTarget.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') { setValue(entry.barcode); setEditing(false) }
          }}
          onBlur={handleSave}
          autoFocus
          style={{ flex: 1 }}
        />
      ) : (
        <div style={{ flex: 1, cursor: editable ? 'pointer' : 'default' }}
          onClick={() => editable && setEditing(true)}
        >
          <Text size="sm" fw={500}>{entry.barcode}</Text>
          <Text size="xs" c="dimmed">{formatDate(entry.created_at)}</Text>
        </div>
      )}
      {editable && (
        <Group gap={4} wrap="nowrap">
          {!editing && (
            <ActionIcon size="sm" variant="subtle" color="blue" onClick={() => setEditing(true)}>
              ✎
            </ActionIcon>
          )}
          {onDelete && (
            <ActionIcon size="sm" variant="subtle" color="red" onClick={() => onDelete(entry.id)}>
              ✕
            </ActionIcon>
          )}
        </Group>
      )}
    </Group>
  )
}

export default function BarcodeDrawer({
  opened, onClose, title, barcodes = [], onUpdate, onDelete, onAdd, badgeLabel = 'registered',
}) {
  const [addInput, setAddInput] = useState('')

  function handleAdd() {
    const val = addInput.trim()
    if (!val || !onAdd) return
    onAdd(val)
    setAddInput('')
  }

  return (
    <Drawer opened={opened} onClose={onClose} title={title || 'Barcodes'} position="right" size="md">
      {onAdd && (
        <>
          <TextInput
            size="sm"
            placeholder="Scan or type identifier + Enter"
            value={addInput}
            onChange={e => setAddInput(e.currentTarget.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
            styles={{ input: { fontFamily: 'monospace' } }}
            mb="sm"
          />
          <Divider mb="sm" />
        </>
      )}
      {barcodes.length === 0 ? (
        <Text ta="center" c="dimmed" py="lg">No barcodes {badgeLabel} for this item yet.</Text>
      ) : (
        <>
          <Group gap="xs" mb="md">
            <Badge color="green" variant="light" size="sm">{barcodes.length} {badgeLabel}</Badge>
          </Group>
          <Stack gap="xs">
            {barcodes.map(entry => (
              <BarcodeRow
                key={entry.id}
                entry={entry}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        </>
      )}
    </Drawer>
  )
}
