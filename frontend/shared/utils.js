export function getCategoryClass(category) {
  if (!category) return 'category-other'
  const cat = category.toLowerCase()
  if (cat.includes('electronic')) return 'category-electronics'
  if (cat.includes('furniture')) return 'category-furniture'
  if (cat.includes('clothing') || cat.includes('apparel')) return 'category-clothing'
  if (cat.includes('book')) return 'category-books'
  return 'category-other'
}

export function getQuantityClass(quantity) {
  if (quantity > 50) return 'quantity-high'
  if (quantity > 10) return 'quantity-medium'
  return 'quantity-low'
}

export function getStatusClass(status) {
  switch (status) {
    case 'pending': return 'status-pending'
    case 'approved': return 'status-approved'
    case 'rejected': return 'status-rejected'
    case 'dispatched': return 'status-dispatched'
    default: return 'status-pending'
  }
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
