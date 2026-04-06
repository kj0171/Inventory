'use client'

import { useState, useRef, useEffect } from 'react'
import { Badge, Button, Group, Paper, Stack, Text, TextInput } from '@mantine/core'

/**
 * Scanner-friendly barcode input.
 * - Single input field, auto-focused
 * - Scanner sends keystrokes + Enter → barcode added to list
 * - Manual typing + Enter works the same
 * - Shows scanned list with remove option
 * - "Register" commits all scanned barcodes
 *
 * Props:
 *   remaining  — how many units still need barcodes
 *   registered — how many already registered (for display)
 *   onRegister — (barcodes: string[]) => void
 *   autoFocus  — auto-focus input on mount (default true)
 */
export default function ScannerInput({ remaining, registered = 0, onRegister, autoFocus = true }) {
  const [scanned, setScanned] = useState([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const left = remaining - scanned.length

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addBarcode()
    }
  }

  function addBarcode() {
    const val = input.trim()
    setError('')
    if (!val) return
    if (scanned.includes(val)) {
      setError(`"${val}" already scanned`)
      return
    }
    if (scanned.length >= remaining) {
      setError(`All ${remaining} units already scanned`)
      return
    }
    setScanned(prev => [...prev, val])
    setInput('')
    // Re-focus for next scan
    if (inputRef.current) inputRef.current.focus()
  }

  function removeBarcode(index) {
    setScanned(prev => prev.filter((_, i) => i !== index))
    setError('')
    if (inputRef.current) inputRef.current.focus()
  }

  function handleRegister() {
    if (scanned.length === 0) {
      setError('Scan at least one barcode')
      return
    }
    onRegister(scanned)
    setScanned([])
    setInput('')
    setError('')
  }

  return (
    <Stack gap="xs" onClick={e => e.stopPropagation()}>
      {/* Scanner input — scanner sends Enter after each scan */}
      <TextInput
        ref={inputRef}
        size="sm"
        placeholder={left > 0 ? `Scan or type barcode + Enter (${left} remaining)` : 'All units scanned'}
        value={input}
        onChange={e => setInput(e.currentTarget.value)}
        onKeyDown={handleKeyDown}
        disabled={left <= 0}
        styles={{ input: { fontFamily: 'monospace' } }}
      />

      {error && <Text size="xs" c="red">{error}</Text>}

      {/* Scanned list */}
      {scanned.length > 0 && (
        <Paper p="xs" withBorder radius="sm" style={{ maxHeight: 200, overflowY: 'auto' }}>
          <Stack gap={4}>
            {scanned.map((code, i) => (
              <Group key={i} justify="space-between" gap="xs">
                <Group gap="xs">
                  <Badge size="xs" variant="light" color="gray">#{registered + i + 1}</Badge>
                  <Text size="sm" ff="monospace">{code}</Text>
                </Group>
                <Text size="xs" c="red" style={{ cursor: 'pointer' }} onClick={() => removeBarcode(i)}>✕</Text>
              </Group>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Actions */}
      <Group justify="space-between">
        <Text size="xs" c="dimmed">{scanned.length} scanned / {remaining} total</Text>
        <Button size="compact-xs" onClick={handleRegister} disabled={scanned.length === 0}>
          Register {scanned.length}
        </Button>
      </Group>
    </Stack>
  )
}
