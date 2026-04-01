export function getCategoryColor(category) {
  if (!category) return { bg: '#f5f5f5', color: '#666' }
  const cat = category.toLowerCase()
  if (cat.includes('electronic')) return { bg: '#e3f2fd', color: '#1976d2' }
  if (cat.includes('furniture')) return { bg: '#f3e5f5', color: '#7b1fa2' }
  if (cat.includes('clothing') || cat.includes('apparel')) return { bg: '#e8f5e8', color: '#388e3c' }
  if (cat.includes('book')) return { bg: '#fff3e0', color: '#f57c00' }
  return { bg: '#f5f5f5', color: '#666' }
}

export function getQuantityColor(quantity) {
  if (quantity > 50) return 'green'
  if (quantity > 10) return 'yellow'
  return 'red'
}

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function formatDateShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: '2-digit'
  })
}
