import DesktopTable from './DesktopTable'
import MobileCards from './MobileCards'

export default function InventoryTable({
  filteredData, groupedData, data,
  collapsedCategories, collapsedItemGroups,
  onToggleCategory, onToggleItemGroup, onToggleAll, onBlockInventory, onUnblockInventory
}) {
  return (
    <div className="table-container">
      <div className="table-header">
        <h2 className="table-title">
          Inventory Overview
          <span className="results-count">
            ({filteredData.length} items in {Object.keys(groupedData).length} categories)
          </span>
        </h2>
        {Object.keys(groupedData).length > 0 && (
          <button className="toggle-all-btn" onClick={onToggleAll}>
            {Object.keys(groupedData).every(cat => collapsedCategories[cat])
              ? '📂 Expand All' : '📁 Collapse All'}
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
          <DesktopTable
            groupedData={groupedData}
            collapsedCategories={collapsedCategories}
            collapsedItemGroups={collapsedItemGroups}
            onToggleCategory={onToggleCategory}
            onToggleItemGroup={onToggleItemGroup}
            onBlockInventory={onBlockInventory}
            onUnblockInventory={onUnblockInventory}
          />
          <MobileCards
            groupedData={groupedData}
            collapsedCategories={collapsedCategories}
            collapsedItemGroups={collapsedItemGroups}
            onToggleCategory={onToggleCategory}
            onToggleItemGroup={onToggleItemGroup}
            onBlockInventory={onBlockInventory}
            onUnblockInventory={onUnblockInventory}
          />
        </>
      )}
    </div>
  )
}
