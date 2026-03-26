'use client'

import { useEffect, useState, useMemo } from 'react'
import { inventoryStockService } from '../backend'
import StatsGrid from './StatsGrid'
import Filters from './Filters'
import InventoryTable from './InventoryTable'

export default function InventoryDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsedCategories, setCollapsedCategories] = useState({})
  const [collapsedItemGroups, setCollapsedItemGroups] = useState({})
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
    itemGroup: 'all',
    stockLevel: 'all',
    ageFilter: 'all',
    sortBy: 'date',
    sortOrder: 'desc'
  })

  const [stats, setStats] = useState({
    totalItems: 0,
    totalStock: 0,
    categories: 0,
    lowStock: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data, error } = await inventoryStockService.getAll()

    if (!error && data) {
      setData(data)
      setStats(inventoryStockService.calculateStats(data))
    } else if (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  // Get unique categories and item groups for filter dropdowns
  const uniqueCategories = useMemo(() => {
    const categories = data.map(item => item.inventory_items?.item_category).filter(Boolean)
    return [...new Set(categories)].sort()
  }, [data])

  const uniqueItemGroups = useMemo(() => {
    const itemGroups = data.map(item => item.inventory_items?.item_group).filter(Boolean)
    return [...new Set(itemGroups)].sort()
  }, [data])

  // Initialize all sections as collapsed when data is first loaded
  useEffect(() => {
    if (data.length > 0 && Object.keys(collapsedCategories).length === 0 && Object.keys(collapsedItemGroups).length === 0) {
      const initialCollapsedCategories = {}
      uniqueCategories.forEach(category => {
        initialCollapsedCategories[category] = true
      })
      setCollapsedCategories(initialCollapsedCategories)

      const initialCollapsedItemGroups = {}
      data.forEach(item => {
        const category = item.inventory_items?.item_category
        const itemGroup = item.inventory_items?.item_group
        if (category && itemGroup) {
          const key = `${category}:${itemGroup}`
          initialCollapsedItemGroups[key] = true
        }
      })
      setCollapsedItemGroups(initialCollapsedItemGroups)
    }
  }, [data, uniqueCategories, collapsedCategories, collapsedItemGroups])

  // Filter and sort data based on current filters
  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      const itemName = item.inventory_items?.name?.toLowerCase() || ''
      const category = item.inventory_items?.item_category || ''
      const itemGroup = item.inventory_items?.item_group || ''
      const quantity = item.quantity || 0
      const date = new Date(item.created_at)

      if (filters.search && !itemName.includes(filters.search.toLowerCase())) return false
      if (filters.category !== 'all' && category !== filters.category) return false
      if (filters.itemGroup !== 'all' && itemGroup !== filters.itemGroup) return false
      if (filters.stockLevel === 'low' && quantity >= 10) return false
      if (filters.stockLevel === 'medium' && (quantity < 10 || quantity > 50)) return false
      if (filters.stockLevel === 'high' && quantity <= 50) return false

      if (filters.ageFilter !== 'all') {
        const daysDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24))
        const minDays = parseInt(filters.ageFilter)
        if (daysDiff < minDays) return false
      }

      return true
    })

    filtered.sort((a, b) => {
      let aValue, bValue
      switch (filters.sortBy) {
        case 'name':
          aValue = a.inventory_items?.name || ''; bValue = b.inventory_items?.name || ''; break
        case 'category':
          aValue = a.inventory_items?.item_category || ''; bValue = b.inventory_items?.item_category || ''; break
        case 'itemGroup':
          aValue = a.inventory_items?.item_group || ''; bValue = b.inventory_items?.item_group || ''; break
        case 'quantity':
          aValue = a.quantity || 0; bValue = b.quantity || 0; break
        case 'date': default:
          aValue = new Date(a.created_at); bValue = new Date(b.created_at); break
      }
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [data, filters])

  // Group filtered data by category → item group
  const groupedData = useMemo(() => {
    const categoryGroups = {}
    filteredData.forEach(item => {
      const category = item.inventory_items?.item_category || 'Other'
      const itemGroup = item.inventory_items?.item_group || 'Other'
      if (!categoryGroups[category]) categoryGroups[category] = {}
      if (!categoryGroups[category][itemGroup]) categoryGroups[category][itemGroup] = []
      categoryGroups[category][itemGroup].push(item)
    })

    const sortedGroups = {}
    Object.keys(categoryGroups).sort().forEach(category => {
      sortedGroups[category] = {}
      Object.keys(categoryGroups[category]).sort().forEach(itemGroup => {
        sortedGroups[category][itemGroup] = categoryGroups[category][itemGroup]
      })
    })
    return sortedGroups
  }, [filteredData])

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({
      search: '', category: 'all', itemGroup: 'all',
      stockLevel: 'all', ageFilter: 'all', sortBy: 'date', sortOrder: 'desc'
    })
  }

  function toggleCategoryCollapse(category) {
    setCollapsedCategories(prev => ({ ...prev, [category]: !prev[category] }))
  }

  function toggleItemGroupCollapse(category, itemGroup) {
    const key = `${category}:${itemGroup}`
    setCollapsedItemGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function toggleAllCategories() {
    const allCategories = Object.keys(groupedData)
    const allCollapsed = allCategories.every(cat => collapsedCategories[cat])
    if (allCollapsed) {
      setCollapsedCategories({})
    } else {
      const newCollapsed = {}
      allCategories.forEach(cat => { newCollapsed[cat] = true })
      setCollapsedCategories(newCollapsed)
    }
  }

  async function handleBlockInventory(id, blockedQty) {
    const item = data.find(d => d.id === id)
    const { error } = await inventoryStockService.updateBlockedQty(id, blockedQty, item?.item_id)
    if (error) {
      console.error('Error updating blocked quantity:', error)
      alert('Failed to update blocked quantity. Please try again.')
    } else {
      setData(prev => prev.map(d =>
        d.id === id ? { ...d, blocked_qty: blockedQty } : d
      ))
    }
  }

  async function handleUnblockInventory(id, blockedQty) {
    const item = data.find(d => d.id === id)
    const { error } = await inventoryStockService.updateBlockedQty(id, blockedQty, item?.item_id)
    if (error) {
      console.error('Error updating blocked quantity:', error)
      alert('Failed to unblock quantity. Please try again.')
    } else {
      setData(prev => prev.map(d =>
        d.id === id ? { ...d, blocked_qty: blockedQty } : d
      ))
    }
  }

  function exportData() {
    const csvContent = [
      ['Item Name', 'Category', 'Quantity', 'Blocked Qty', 'Date'],
      ...filteredData.map(row => [
        row.inventory_items?.name || '',
        row.inventory_items?.item_category || '',
        row.quantity,
        row.blocked_qty || 0,
        new Date(row.created_at).toLocaleDateString()
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
    return (
      <div className="dashboard-container">
        <div className="loading">Loading inventory data...</div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Inventory Management</h1>
        <p className="dashboard-subtitle">Professional inventory tracking and analytics with advanced filtering</p>
      </div>

      <StatsGrid
        filteredCount={filteredData.length}
        totalStock={stats.totalStock}
        categoriesCount={uniqueCategories.length}
        lowStock={stats.lowStock}
      />

      <Filters
        filters={filters}
        uniqueCategories={uniqueCategories}
        uniqueItemGroups={uniqueItemGroups}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        onExport={exportData}
      />

      <InventoryTable
        filteredData={filteredData}
        groupedData={groupedData}
        data={data}
        collapsedCategories={collapsedCategories}
        collapsedItemGroups={collapsedItemGroups}
        onToggleCategory={toggleCategoryCollapse}
        onToggleItemGroup={toggleItemGroupCollapse}
        onToggleAll={toggleAllCategories}
        onBlockInventory={handleBlockInventory}
        onUnblockInventory={handleUnblockInventory}
      />
    </div>
  )
}
