'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

export default function InventoryDashboard() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    category: 'all',
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
    
    const { data, error } = await supabase
      .from('inventory_stock')
      .select(`
        quantity,
        created_at,
        inventory_items (
          name,
          item_category
        )
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setData(data)
      calculateStats(data)
    } else if (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  function calculateStats(inventoryData) {
    const totalItems = inventoryData.length
    const totalStock = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0)
    const categories = new Set(inventoryData.map(item => item.inventory_items?.item_category)).size
    const lowStock = inventoryData.filter(item => item.quantity < 10).length

    setStats({ totalItems, totalStock, categories, lowStock })
  }

  // Get unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const categories = data.map(item => item.inventory_items?.item_category).filter(Boolean)
    return [...new Set(categories)].sort()
  }, [data])

  // Filter and sort data based on current filters
  const filteredData = useMemo(() => {
    let filtered = data.filter(item => {
      const itemName = item.inventory_items?.name?.toLowerCase() || ''
      const category = item.inventory_items?.item_category || ''
      const quantity = item.quantity || 0
      const date = new Date(item.created_at)

      // Search filter
      if (filters.search && !itemName.includes(filters.search.toLowerCase())) {
        return false
      }

      // Category filter
      if (filters.category !== 'all' && category !== filters.category) {
        return false
      }

      // Stock level filter
      if (filters.stockLevel === 'low' && quantity >= 10) return false
      if (filters.stockLevel === 'medium' && (quantity < 10 || quantity > 50)) return false
      if (filters.stockLevel === 'high' && quantity <= 50) return false

      // Age filter (items OLDER than the selected period)
      if (filters.ageFilter !== 'all') {
        const daysDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24))
        const minDays = parseInt(filters.ageFilter)
        if (daysDiff < minDays) return false // Only show items older than X days
      }

      return true
    })

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue

      switch (filters.sortBy) {
        case 'name':
          aValue = a.inventory_items?.name || ''
          bValue = b.inventory_items?.name || ''
          break
        case 'category':
          aValue = a.inventory_items?.item_category || ''
          bValue = b.inventory_items?.item_category || ''
          break
        case 'quantity':
          aValue = a.quantity || 0
          bValue = b.quantity || 0
          break
        case 'date':
        default:
          aValue = new Date(a.created_at)
          bValue = new Date(b.created_at)
          break
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
      search: '',
      category: 'all',
      stockLevel: 'all',
      ageFilter: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    })
  }

  function exportData() {
    const csvContent = [
      ['Item Name', 'Category', 'Quantity', 'Date'],
      ...filteredData.map(row => [
        row.inventory_items?.name || '',
        row.inventory_items?.item_category || '',
        row.quantity,
        new Date(row.created_at).toLocaleDateString()
      ])
    ].map(row => row.map(cell => `\"${cell}\"`).join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  function getCategoryClass(category) {
    if (!category) return 'category-other'
    const cat = category.toLowerCase()
    if (cat.includes('electronic')) return 'category-electronics'
    if (cat.includes('furniture')) return 'category-furniture'
    if (cat.includes('clothing') || cat.includes('apparel')) return 'category-clothing'
    if (cat.includes('book')) return 'category-books'
    return 'category-other'
  }

  function getQuantityClass(quantity) {
    if (quantity > 50) return 'quantity-high'
    if (quantity > 10) return 'quantity-medium'
    return 'quantity-low'
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

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{filteredData.length}</div>
          <div className="stat-label">Filtered Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.totalStock}</div>
          <div className="stat-label">Total Stock</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{uniqueCategories.length}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.lowStock}</div>
          <div className="stat-label">Low Stock Alert</div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-container">
        <div className="filters-header">
          <h3>Filters & Search</h3>
          <div className="filter-actions">
            <button className="btn-secondary" onClick={clearFilters}>Clear All</button>
            <button className="btn-primary" onClick={exportData}>Export CSV</button>
          </div>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Search Items</label>
            <input
              type="text"
              placeholder="Search by item name..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Stock Level</label>
            <select
              value={filters.stockLevel}
              onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Levels</option>
              <option value="low">Low Stock (&lt; 10)</option>
              <option value="medium">Medium Stock (10-50)</option>
              <option value="high">High Stock (&gt; 50)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Item Age</label>
            <select
              value={filters.ageFilter}
              onChange={(e) => handleFilterChange('ageFilter', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Ages</option>
              <option value="15">Older than 15 Days</option>
              <option value="30">Older than 30 Days</option>
              <option value="60">Older than 60 Days</option>
              <option value="90">Older than 90 Days</option>
              <option value="120">Older than 120 Days</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <div className="sort-controls">
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="filter-select"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="category">Category</option>
                <option value="quantity">Quantity</option>
              </select>
              <button
                onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                className="sort-toggle"
                title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {filters.sortOrder === 'asc' ? '\u2191' : '\u2193'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="table-container">
        <div className="table-header">
          <h2 className="table-title">
            Inventory Overview 
            <span className="results-count">({filteredData.length} items)</span>
          </h2>
        </div>
        
        {filteredData.length === 0 ? (
          <div className="empty-state">
            <h3>{data.length === 0 ? 'No inventory data found' : 'No items match your filters'}</h3>
            <p>
              {data.length === 0 
                ? 'Start by adding some items to your inventory.' 
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th>Stock Level</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <div className="item-info">
                        <strong className="item-name">{row.inventory_items?.name || 'Unknown Item'}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`category-badge ${getCategoryClass(row.inventory_items?.item_category)}`}>
                        {row.inventory_items?.item_category || 'Other'}
                      </span>
                    </td>
                    <td>
                      <span className={`quantity-badge ${getQuantityClass(row.quantity)}`}>
                        {row.quantity} units
                      </span>
                    </td>
                    <td>
                      <span className="date-text">
                        {new Date(row.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}