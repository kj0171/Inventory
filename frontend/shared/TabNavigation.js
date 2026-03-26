'use client'

import { canAccess } from './auth'

const TABS = [
  { id: 'inventory', label: 'Inventory' },
  { id: 'sales', label: 'Sales Orders' },
  { id: 'dispatch', label: 'Dispatch' },
]

export default function TabNavigation({ activeTab, onTabChange }) {
  const visibleTabs = TABS.filter(tab => canAccess(tab.id))

  return (
    <div className="tab-navigation">
      {visibleTabs.map(tab => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
