'use client'

import { useState, useRef, useEffect } from 'react'
import { Stack, Text, TextInput } from '@mantine/core'

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
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      addBarcode()
    }
  }

  function addBarcode() {
    const val = input.trim()
    setError('')
    if (!val) return
    if (remaining <= 0) {
      setError(`All units already scanned`)
      return
    }
    setInput('')
    onRegister([val])
    // Re-focus after React re-render completes
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus()
    }, 50)
  }

  return (
    <Stack gap="xs" onClick={e => e.stopPropagation()}>
      <form onSubmit={e => { e.preventDefault(); addBarcode() }}>
        <TextInput
          ref={inputRef}
          size="sm"
          placeholder={remaining > 0 ? `Scan or type barcode + Enter (${remaining} remaining)` : 'All units scanned'}
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
          disabled={remaining <= 0}
          styles={{ input: { fontFamily: 'monospace' } }}
          inputMode="text"
          enterKeyHint="done"
        />
      </form>

      {error && <Text size="xs" c="red">{error}</Text>}
    </Stack>
  )
}
