export default function StatsGrid({ filteredCount, totalStock, categoriesCount, lowStock }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-number">{filteredCount}</div>
        <div className="stat-label">Filtered Items</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{totalStock}</div>
        <div className="stat-label">Total Stock</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{categoriesCount}</div>
        <div className="stat-label">Categories</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{lowStock}</div>
        <div className="stat-label">Low Stock Alert</div>
      </div>
    </div>
  )
}
