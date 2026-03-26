import { supabase } from './supabaseClient'

/**
 * Service class for inventory_stock table operations.
 * Handles fetching stock records with related item details.
 */
export class InventoryStockService {
  /**
   * Fetch all inventory stock with joined inventory_items data.
   * @returns {Promise<{data: array, error: object|null}>}
   */
  async getAll() {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select(`
        id,
        quantity,
        blocked_qty,
        created_at,
        item_id,
        inventory_items (
          name,
          item_category,
          item_group
        )
      `)
      .order('created_at', { ascending: false })

    return { data: data || [], error }
  }

  /**
   * Update blocked_qty for a specific inventory stock record.
   * @param {number} id - The inventory_stock record ID
   * @param {number} blockedQty - The new blocked quantity
   * @returns {Promise<{data: object, error: object|null}>}
   */
  async updateBlockedQty(id, blockedQty, inventoryItemId) {
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .update({ blocked_qty: blockedQty })
      .eq('id', id)
      .select()

    if (stockError) return { data: null, error: stockError }

    if (inventoryItemId) {
      // Sum blocked_qty across all stock records for this inventory item
      const { data: allStocks, error: sumError } = await supabase
        .from('inventory_stock')
        .select('blocked_qty')
        .eq('item_id', inventoryItemId)

      if (sumError) return { data: stockData, error: sumError }

      const totalBlocked = allStocks.reduce((sum, s) => sum + (s.blocked_qty || 0), 0)
      const { error: itemError } = await supabase
        .from('inventory_items')
        .update({ blocked_qty: totalBlocked })
        .eq('id', inventoryItemId)

      if (itemError) return { data: stockData, error: itemError }
    }

    return { data: stockData, error: null }
  }

  /**
   * Calculate dashboard statistics from inventory data.
   * @param {array} inventoryData - Array of inventory stock records
   * @returns {{totalItems: number, totalStock: number, categories: number, lowStock: number}}
   */
  calculateStats(inventoryData) {
    const totalItems = inventoryData.length
    const totalStock = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0)
    const categories = new Set(inventoryData.map(item => item.inventory_items?.item_category)).size
    const lowStock = inventoryData.filter(item => item.quantity < 10).length
    return { totalItems, totalStock, categories, lowStock }
  }
}

export const inventoryStockService = new InventoryStockService()
