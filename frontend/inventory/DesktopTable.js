import { getCategoryClass, getQuantityClass } from '../shared/utils'

export default function DesktopTable({
  groupedData, collapsedCategories, collapsedItemGroups,
  onToggleCategory, onToggleItemGroup, onCreateSale
}) {
  return (
    <div className="desktop-table">
      {Object.entries(groupedData).map(([category, itemGroups]) => {
        const isCategoryCollapsed = collapsedCategories[category]
        const totalCategoryItems = Object.values(itemGroups).flat().length

        return (
          <div key={category} className="category-section">
            <div className="category-header" onClick={() => onToggleCategory(category)}>
              <div className="category-header-content">
                <h3 className="category-title">
                  <span className={`category-badge ${getCategoryClass(category)}`}>{category}</span>
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
                    <div className="item-group-header" onClick={() => onToggleItemGroup(category, itemGroup)}>
                      <div className="item-group-header-content">
                        <h4 className="item-group-title">
                          <span className="item-group-badge">{itemGroup}</span>
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
                              <th>Stock</th>
                              <th>Blocked</th>
                              <th>Available</th>
                              <th>Last Updated</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((row, i) => {
                              const available = row.quantity - (row.blocked_qty || 0)
                              return (
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
                                    <span className="quantity-badge blocked-qty-badge">
                                      {row.blocked_qty || 0} units
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`quantity-badge ${getQuantityClass(available)}`}>
                                      {available} units
                                    </span>
                                  </td>
                                  <td>
                                    <span className="date-text">
                                      <span className="date-full">
                                        {new Date(row.created_at).toLocaleDateString('en-US', {
                                          year: 'numeric', month: 'short', day: 'numeric',
                                          hour: '2-digit', minute: '2-digit'
                                        })}
                                      </span>
                                      <span className="date-compact">
                                        {new Date(row.created_at).toLocaleDateString('en-US', {
                                          month: 'short', day: 'numeric'
                                        })}
                                      </span>
                                    </span>
                                  </td>
                                  <td>
                                    {available > 0 && (
                                      <button className="btn-create-sale" onClick={() => onCreateSale(row)}>
                                        Create Sale
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
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
  )
}
