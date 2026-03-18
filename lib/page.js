'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'

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
    
    const { data, error } = await supabase
      .from('inventory_stock')
      .select(`
        quantity,
        created_at,
        inventory_items (
          name,
          item_category,
          item_group
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
      // Collapse all categories
      const initialCollapsedCategories = {}
      uniqueCategories.forEach(category => {
        initialCollapsedCategories[category] = true
      })
      setCollapsedCategories(initialCollapsedCategories)

      // Collapse all item groups
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

      // Search filter
      if (filters.search && !itemName.includes(filters.search.toLowerCase())) {
        return false
      }

      // Category filter
      if (filters.category !== 'all' && category !== filters.category) {
        return false
      }

      // Item Group filter
      if (filters.itemGroup !== 'all' && itemGroup !== filters.itemGroup) {
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
        case 'itemGroup':
          aValue = a.inventory_items?.item_group || ''
          bValue = b.inventory_items?.item_group || ''
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

  // Group filtered data by category and then by item group
  const groupedData = useMemo(() => {
    const categoryGroups = {}
    
    filteredData.forEach(item => {
      const category = item.inventory_items?.item_category || 'Other'
      const itemGroup = item.inventory_items?.item_group || 'Other'
      
      if (!categoryGroups[category]) {
        categoryGroups[category] = {}
      }
      
      if (!categoryGroups[category][itemGroup]) {
        categoryGroups[category][itemGroup] = []
      }
      
      categoryGroups[category][itemGroup].push(item)
    })

    // Sort categories and item groups alphabetically
    const sortedGroups = {}
    Object.keys(categoryGroups)
      .sort()
      .forEach(category => {
        sortedGroups[category] = {}
        Object.keys(categoryGroups[category])
          .sort()
          .forEach(itemGroup => {
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
      search: '',
      category: 'all',
      itemGroup: 'all',
      stockLevel: 'all',
      ageFilter: 'all',
      sortBy: 'date',
      sortOrder: 'desc'
    })
  }

  function toggleCategoryCollapse(category) {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  function toggleItemGroupCollapse(category, itemGroup) {
    const key = `${category}:${itemGroup}`
    setCollapsedItemGroups(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  function toggleAllCategories() {
    const allCategories = Object.keys(groupedData)
    const allCollapsed = allCategories.every(cat => collapsedCategories[cat])
    
    if (allCollapsed) {
      // Expand all
      setCollapsedCategories({})
    } else {
      // Collapse all
      const newCollapsed = {}
      allCategories.forEach(cat => {
        newCollapsed[cat] = true
      })
      setCollapsedCategories(newCollapsed)
    }
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
            <label>Item Group</label>
            <select
              value={filters.itemGroup}
              onChange={(e) => handleFilterChange('itemGroup', e.target.value)}
              className="filter-select"
            >
              <option value="all">All Item Groups</option>
              {uniqueItemGroups.map(itemGroup => (
                <option key={itemGroup} value={itemGroup}>{itemGroup}</option>
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
                <option value="itemGroup">Item Group</option>
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
            <span className="results-count">
              ({filteredData.length} items in {Object.keys(groupedData).length} categories)
            </span>
          </h2>
          {Object.keys(groupedData).length > 0 && (
            <button className="toggle-all-btn" onClick={toggleAllCategories}>
              {Object.keys(groupedData).every(cat => collapsedCategories[cat]) ? 
                '📂 Expand All' : '📁 Collapse All'
              }
            </button>
          )}
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
          <>
            {/* Desktop Table View */}
            <div className="desktop-table">
              {Object.entries(groupedData).map(([category, itemGroups]) => {
                const isCategoryCollapsed = collapsedCategories[category]
                const totalCategoryItems = Object.values(itemGroups).flat().length
                
                return (
                  <div key={category} className="category-section">
                    <div className="category-header" onClick={() => toggleCategoryCollapse(category)}>
                      <div className="category-header-content">
                        <h3 className="category-title">
                          <span className={`category-badge ${getCategoryClass(category)}`}>
                            {category}
                          </span>
                          <span className="category-count">({totalCategoryItems} items in {Object.keys(itemGroups).length} groups)</span>
                        </h3>
                        <div className="collapse-btn">
                          <span className={`collapse-icon ${isCategoryCollapsed ? 'collapsed' : 'expanded'}`}>
                            {isCategoryCollapsed ? '▶' : '▼'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`category-content ${isCategoryCollapsed ? 'collapsed' : 'expanded'}`}>
                      {Object.entries(itemGroups).map(([itemGroup, items]) => {
                        const itemGroupKey = `${category}:${itemGroup}`
                        const isItemGroupCollapsed = collapsedItemGroups[itemGroupKey]
                        
                        return (
                          <div key={itemGroup} className="item-group-section">
                            <div className="item-group-header" onClick={() => toggleItemGroupCollapse(category, itemGroup)}>
                              <div className="item-group-header-content">
                                <h4 className="item-group-title">
                                  <span className="item-group-badge">
                                    {itemGroup}
                                  </span>
                                  <span className="item-group-count">({items.length} items)</span>
                                </h4>
                                <div className="collapse-btn-small">
                                  <span className={`collapse-icon ${isItemGroupCollapsed ? 'collapsed' : 'expanded'}`}>
                                    {isItemGroupCollapsed ? '▶' : '▼'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`item-group-content ${isItemGroupCollapsed ? 'collapsed' : 'expanded'}`}>
                              <div className="table-scroll">
                                <table>
                                  <thead>
                                    <tr>
                                      <th>Item Name</th>
                                      <th>Stock Level</th>
                                      <th>Last Updated</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((row, i) => (
                                      <tr key={i}>
                                        <td>
                                          <div className="item-info">
                                            <strong className="item-name" title={row.inventory_items?.name || 'Unknown Item'}>
                                              {row.inventory_items?.name || 'Unknown Item'}
                                            </strong>
                                          </div>
                                        </td>
                                        <td>
                                          <span className={`quantity-badge ${getQuantityClass(row.quantity)}`}>
                                            {row.quantity} units
                                          </span>
                                        </td>
                                        <td>
                                          <span className="date-text">
                                            <span className="date-full">
                                              {new Date(row.created_at).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                            <span className="date-compact">
                                              {new Date(row.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric'
                                              })}
                                            </span>
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Mobile Card View */}
            <div className="mobile-cards">
              {Object.entries(groupedData).map(([category, itemGroups]) => {
                const isCategoryCollapsed = collapsedCategories[category]
                const totalCategoryItems = Object.values(itemGroups).flat().length
                
                return (
                  <div key={category} className="category-section-mobile">
                    <div className="category-header-mobile" onClick={() => toggleCategoryCollapse(category)}>
                      <div className="category-header-content-mobile">
                        <h3 className="category-title-mobile">
                          <span className={`category-badge ${getCategoryClass(category)}`}>
                            {category}
                          </span>
                          <span className="category-count-mobile">({totalCategoryItems})</span>
                        </h3>
                        <div className="collapse-btn-mobile">
                          <span className={`collapse-icon ${isCategoryCollapsed ? 'collapsed' : 'expanded'}`}>
                            {isCategoryCollapsed ? '▶' : '▼'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`category-content-mobile ${isCategoryCollapsed ? 'collapsed' : 'expanded'}`}>
                      <div className="category-items">
                        {Object.entries(itemGroups).map(([itemGroup, items]) => {
                          const itemGroupKey = `${category}:${itemGroup}`
                          const isItemGroupCollapsed = collapsedItemGroups[itemGroupKey]
                          
                          return (
                            <div key={itemGroup} className="item-group-section-mobile">
                              <div className="item-group-header-mobile" onClick={() => toggleItemGroupCollapse(category, itemGroup)}>
                                <div className="item-group-header-content-mobile">
                                  <h4 className="item-group-title-mobile">
                                    <span className="item-group-badge-mobile">
                                      {itemGroup}
                                    </span>
                                    <span className="item-group-count-mobile">({items.length})</span>
                                  </h4>
                                  <div className="collapse-btn-small-mobile">
                                    <span className={`collapse-icon ${isItemGroupCollapsed ? 'collapsed' : 'expanded'}`}>
                                      {isItemGroupCollapsed ? '▶' : '▼'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={`item-group-content-mobile ${isItemGroupCollapsed ? 'collapsed' : 'expanded'}`}>
                                {items.map((row, i) => (
                                  <div key={i} className="inventory-card">
                                    <div className="card-header">
                                      <h5 className="card-title">
                                        {row.inventory_items?.name || 'Unknown Item'}
                                      </h5>
                                    </div>
                                    
                                    <div className="card-details">
                                      <div className="card-detail">
                                        <div className="card-detail-label">Stock Level</div>
                                        <div className="card-detail-value">
                                          <span className={`quantity-badge ${getQuantityClass(row.quantity)}`}>
                                            {row.quantity} units
                                          </span>
                                        </div>
                                      </div>
                                      <div className="card-detail">
                                        <div className="card-detail-label">Last Updated</div>
                                        <div className="card-detail-value">
                                          {new Date(row.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: '2-digit'
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}