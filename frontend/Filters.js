export default function Filters({ filters, uniqueCategories, uniqueItemGroups, onFilterChange, onClearFilters, onExport }) {
  return (
    <div className="filters-container">
      <div className="filters-header">
        <h3>Filters &amp; Search</h3>
        <div className="filter-actions">
          <button className="btn-secondary" onClick={onClearFilters}>Clear All</button>
          <button className="btn-primary" onClick={onExport}>Export CSV</button>
        </div>
      </div>

      <div className="filters-grid">
        <div className="filter-group">
          <label>Search Items</label>
          <input
            type="text"
            placeholder="Search by item name..."
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Category</label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
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
            onChange={(e) => onFilterChange('itemGroup', e.target.value)}
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
            onChange={(e) => onFilterChange('stockLevel', e.target.value)}
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
            onChange={(e) => onFilterChange('ageFilter', e.target.value)}
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
              onChange={(e) => onFilterChange('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="category">Category</option>
              <option value="itemGroup">Item Group</option>
              <option value="quantity">Quantity</option>
            </select>
            <button
              onClick={() => onFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              className="sort-toggle"
              title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {filters.sortOrder === 'asc' ? '\u2191' : '\u2193'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
