'use client'

import { useState, useEffect } from 'react'

// In-memory stock receipts store — will be replaced with backend later
let _receipts = [
  {
    id: 'receipt-seed-1',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    items: [
      { itemId: 'seed-1', name: 'Samsung 5.5kg Washing Machine', category: 'Appliances', brand: 'Samsung', quantity: 10 },
      { itemId: 'seed-2', name: 'Wooden Almirah 6ft', category: 'Furniture', brand: 'Local', quantity: 5 },
    ],
  },
  {
    id: 'receipt-seed-2',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { itemId: 'seed-3', name: 'Havells Ceiling Fan 1200mm', category: 'Electricals', brand: 'Havells', quantity: 20 },
    ],
  },
]

const _listeners = new Set()

function notify() {
  _listeners.forEach(fn => fn([..._receipts]))
}

export function addStockReceipt({ items }) {
  const receipt = {
    id: `receipt-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'open',
    items: items.map(item => ({
      itemId: item.itemId || item.id,
      name: item.name,
      category: item.category || item.item_category || '',
      brand: item.brand || item.item_group || '',
      quantity: item.quantity,
    })),
  }
  _receipts = [receipt, ..._receipts]
  notify()
  return receipt
}

export function markReceiptComplete(receiptId) {
  _receipts = _receipts.map(r =>
    r.id === receiptId ? { ...r, status: 'completed' } : r
  )
  notify()
}

export function getStockReceipts() {
  return [..._receipts]
}

export function useStockReceipts() {
  const [receipts, setReceipts] = useState(() => [..._receipts])

  useEffect(() => {
    const handler = (updated) => setReceipts(updated)
    _listeners.add(handler)
    return () => _listeners.delete(handler)
  }, [])

  return receipts
}
