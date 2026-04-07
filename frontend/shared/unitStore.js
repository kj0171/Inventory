'use client'

// In-memory unit store — will be replaced with backend later
// Keyed by itemId → array of unit objects
let _units = {}

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
