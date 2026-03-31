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
   * Reduce quantity for a specific inventory stock record (e.g. on dispatch).
   * Also updates the parent inventory_items quantity.
   * @param {string} id - The inventory_stock record ID
   * @param {number} reduceBy - Amount to reduce
   * @param {string} inventoryItemId - The parent inventory_items ID
   */
  async reduceQuantity(id, reduceBy, inventoryItemId) {
    const { data: current, error: fetchError } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('id', id)
      .single()

    if (fetchError) return { data: null, error: fetchError }

    const newQty = Math.max(0, (current.quantity || 0) - reduceBy)
    const { data: stockData, error: stockError } = await supabase
      .from('inventory_stock')
      .update({ quantity: newQty })
      .eq('id', id)
      .select()

    if (stockError) return { data: null, error: stockError }

    if (inventoryItemId) {
      const { data: allStocks, error: sumError } = await supabase
        .from('inventory_stock')
        .select('quantity')
        .eq('item_id', inventoryItemId)

      if (!sumError && allStocks) {
        const totalQty = allStocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
        await supabase
          .from('inventory_items')
          .update({ unit: totalQty })
          .eq('id', inventoryItemId)
      }
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

  async getItems() {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, item_category, item_group')
      .order('name', { ascending: true })
    return { data: data || [], error }
  }

  async createItem({ name, item_category, item_group }) {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert({ name, item_category, item_group, unit: 0, blocked_qty: 0 })
      .select()
      .single()
    return { data, error }
  }

  async addStock(item_id, quantity) {
    const { data, error } = await supabase
      .from('inventory_stock')
      .insert({ item_id, quantity, blocked_qty: 0 })
      .select()
      .single()

    if (error) return { data: null, error }

    // Recalculate parent inventory_items quantity
    const { data: allStocks, error: sumError } = await supabase
      .from('inventory_stock')
      .select('quantity')
      .eq('item_id', item_id)

    if (!sumError && allStocks) {
      const totalQty = allStocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
      await supabase
        .from('inventory_items')
        .update({ unit: totalQty })
        .eq('id', item_id)
    }

    return { data, error: null }
  }
}

export const inventoryStockService = new InventoryStockService()
