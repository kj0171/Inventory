'use client'

import { useState, useEffect } from 'react'

// In-memory unit store — will be replaced with backend later
// Keyed by itemId → array of unit objects
let _units = {
  'seed-1': [
    { id: 'u-1', serial_number: 'SN-SAM-1001', status: 'available', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'u-2', serial_number: 'SN-SAM-1002', status: 'available', created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: 'u-3', serial_number: 'SN-SAM-1003', status: 'dispatched', created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  ],
}

const _listeners = new Set()

function notify() {
  _listeners.forEach(fn => fn())
}

export function registerUnits(itemId, serialNumbers) {
  const existing = _units[itemId] || []
  const newUnits = serialNumbers.map((sn, i) => ({
    id: `unit-${itemId}-${Date.now()}-${i}`,
    serial_number: sn,
    status: 'available',
    created_at: new Date().toISOString(),
  }))
  _units[itemId] = [...existing, ...newUnits]
  notify()
  return newUnits
}

export function getUnitsForItem(itemId) {
  return _units[itemId] || []
}

export function getAllUnits() {
  return { ..._units }
}

export function getRegisteredCount(itemId) {
  return (_units[itemId] || []).length
}

export function useUnitsForItem(itemId) {
  const [units, setUnits] = useState(() => _units[itemId] || [])

  useEffect(() => {
    setUnits(_units[itemId] || [])
    const handler = () => setUnits(_units[itemId] || [])
    _listeners.add(handler)
    return () => _listeners.delete(handler)
  }, [itemId])

  return units
}
