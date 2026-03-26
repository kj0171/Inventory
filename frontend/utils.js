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
