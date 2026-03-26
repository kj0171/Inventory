import { getCategoryClass, getQuantityClass } from '../shared/utils'

export default function MobileCards({
  groupedData, collapsedCategories, collapsedItemGroups,
  onToggleCategory, onToggleItemGroup, onCreateSale
}) {
  return (
    <div className="mobile-cards">
      {Object.entries(groupedData).map(([category, itemGroups]) => {
        const isCategoryCollapsed = collapsedCategories[category]
        const totalCategoryItems = Object.values(itemGroups).flat().length

        return (
          <div key={category} className="category-section-mobile">
            <div className="category-header-mobile" onClick={() => onToggleCategory(category)}>
              <div className="category-header-content-mobile">
                <h3 className="category-title-mobile">
                  <span className={`category-badge ${getCategoryClass(category)}`}>{category}</span>
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
                      <div className="item-group-header-mobile" onClick={() => onToggleItemGroup(category, itemGroup)}>
                        <div className="item-group-header-content-mobile">
                          <h4 className="item-group-title-mobile">
                            <span className="item-group-badge-mobile">{itemGroup}</span>
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
                        {items.map((row, i) => {
                          const available = row.quantity - (row.blocked_qty || 0)
                          return (
                            <div key={i} className="inventory-card">
                              <div className="card-header">
                                <h5 className="card-title">{row.inventory_items?.name || 'Unknown Item'}</h5>
                              </div>
                              <div className="card-details">
                                <div className="card-detail">
                                  <div className="card-detail-label">Stock</div>
                                  <div className="card-detail-value">
                                    <span className={`quantity-badge ${getQuantityClass(row.quantity)}`}>
                                      {row.quantity} units
                                    </span>
                                  </div>
                                </div>
                                <div className="card-detail">
                                  <div className="card-detail-label">Blocked</div>
                                  <div className="card-detail-value">
                                    <span className="quantity-badge blocked-qty-badge">{row.blocked_qty || 0} units</span>
                                  </div>
                                </div>
                                <div className="card-detail">
                                  <div className="card-detail-label">Available</div>
                                  <div className="card-detail-value">
                                    <span className={`quantity-badge ${getQuantityClass(available)}`}>{available} units</span>
                                  </div>
                                </div>
                                <div className="card-detail">
                                  <div className="card-detail-label">Last Updated</div>
                                  <div className="card-detail-value">
                                    {new Date(row.created_at).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric', year: '2-digit'
                                    })}
                                  </div>
                                </div>
                              </div>
                              {available > 0 && (
                                <div className="card-actions">
                                  <button className="btn-create-sale" onClick={() => onCreateSale(row)}>Create Sale</button>
                                </div>
                              )}
                            </div>
                          )
                        })}
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
  )
}
