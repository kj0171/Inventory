'use client'

import { useEffect, useState, useMemo } from 'react'
import { Center, Loader } from '@mantine/core'
import { inventoryItemService, inventoryUnitService } from '../../backend'
import StatsGrid from './StatsGrid'
import Filters from './Filters'
import InventoryTable from './InventoryTable'
import BarcodeDrawer from '../shared/BarcodeDrawer'
import { TRACKING_ENABLED } from '../shared/trackingConfig'

export default function InventoryDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    brand: 'all',
    stockLevel: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    categories: 0,
    lowStock: 0
  })

  // Barcode drawer state
  const [drawerItem, setDrawerItem] = useState(null)
  const [drawerBarcodes, setDrawerBarcodes] = useState([])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data, error } = await inventoryItemService.getAll()
    if (!error && data) {
      setData(data)
      setStats(inventoryItemService.calculateStats(data))
    } else if (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const uniqueCategories = useMemo(() => {
    const categories = data.map(item => item.item_category).filter(Boolean)
    return [...new Set(categories)].sort()
  }, [data])

  const uniqueBrands = useMemo(() => {
    const brands = data.map(item => item.item_group).filter(Boolean)
    return [...new Set(brands)].sort()
  }, [data])

  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      const itemName = item.name?.toLowerCase() || ''
      const category = item.item_category || ''
      const brand = item.item_group || ''
      const quantity = item.quantity || 0

      if (filters.search && !itemName.includes(filters.search.toLowerCase())) return false
      if (filters.category !== 'all' && category !== filters.category) return false
      if (filters.brand !== 'all' && brand !== filters.brand) return false
      if (filters.stockLevel === 'low' && quantity >= 10) return false
      if (filters.stockLevel === 'medium' && (quantity < 10 || quantity > 50)) return false
      if (filters.stockLevel === 'high' && quantity <= 50) return false
      return true
    })

    filtered.sort((a, b) => {
      let aValue, bValue
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name || ''; bValue = b.name || ''; break
        case 'quantity':
          aValue = a.quantity || 0; bValue = b.quantity || 0; break
        case 'date': default:
          aValue = a.name || ''; bValue = b.name || ''; break
      }
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })
    return filtered
  }, [data, filters])

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({
      search: '', category: 'all', brand: 'all', stockLevel: 'all',
      sortBy: 'date', sortOrder: 'desc'
    })
  }

  function handleStatClick(key) {
    if (key === 'low') {
      // Toggle low-stock filter
      setFilters(prev => ({
        ...prev,
        stockLevel: prev.stockLevel === 'low' ? 'all' : 'low'
      }))
    } else {
      // "all" cards reset filters
      clearFilters()
    }
  }

  function handleSort(field) {
    setFilters(prev => {
      if (prev.sortBy === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }
      }
      return { ...prev, sortBy: field, sortOrder: 'asc' }
    })
  }

  async function fetchBarcodes(inventoryId) {
    const { data } = await inventoryUnitService.getByInventoryId(inventoryId)
    setDrawerBarcodes((data || []).map(u => ({ ...u, barcode: u.identifier })))
  }

  function handleRowClick(row) {
    setDrawerItem(row)
    fetchBarcodes(row.id)
  }

  async function handleUpdateBarcode(unitId, newValue) {
    const { error } = await inventoryUnitService.update(unitId, { identifier: newValue })
    if (!error && drawerItem) fetchBarcodes(drawerItem.id)
  }

  async function handleDeleteBarcode(unitId) {
    const { error } = await inventoryUnitService.delete(unitId)
    if (!error && drawerItem) fetchBarcodes(drawerItem.id)
  }

  async function handleAddBarcode(identifier) {
    if (!drawerItem) return
    const { error } = await inventoryUnitService.create([{ inventory_id: drawerItem.id, identifier }])
    if (!error) fetchBarcodes(drawerItem.id)
  }

  function exportData() {
    const csvContent = [
      ['Item Name', 'Category', 'Brand', 'Quantity', 'Blocked Qty', 'Available'],
      ...filteredData.map(row => [
        row.name || '',
        row.item_category || '',
        row.item_group || '',
        row.quantity,
        row.blocked_qty || 0,
        row.quantity - (row.blocked_qty || 0),
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <Center py="xl"><Loader size="lg" /></Center>
  }

  return (
    <>
      <StatsGrid
        filteredCount={filteredData.length}
        totalStock={stats.totalStock}
        categoriesCount={uniqueCategories.length}
        lowStock={stats.lowStock}
        activeFilter={filters.stockLevel}
        onStatClick={handleStatClick}
      />

      <Filters
        filters={filters}
        uniqueCategories={uniqueCategories}
        uniqueBrands={uniqueBrands}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      <InventoryTable
        filteredData={filteredData}
        data={data}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSort={handleSort}
        onExport={exportData}
        onRowClick={TRACKING_ENABLED ? handleRowClick : undefined}
      />

      {TRACKING_ENABLED && (
        <BarcodeDrawer
          opened={!!drawerItem}
          onClose={() => { setDrawerItem(null); setDrawerBarcodes([]) }}
          title={drawerItem?.name || 'Barcodes'}
          barcodes={drawerBarcodes}
          onUpdate={handleUpdateBarcode}
          onDelete={handleDeleteBarcode}
          onAdd={handleAddBarcode}
          badgeLabel="registered"
        />
      )}
    </>
  )
}
