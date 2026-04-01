import { supabase } from './supabaseClient'
import { InventoryItemDao } from './dao/inventoryItemDao'
import { InventoryStockDao } from './dao/inventoryStockDao'
import { InventoryItemDto } from './dto/inventoryItemDto'
import { InventoryStockDto } from './dto/inventoryStockDto'

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
      .from(InventoryStockDao.TABLE)
      .select(InventoryStockDao.SELECT_WITH_ITEM)
      .order(InventoryStockDao.COLUMNS.created_at, { ascending: false })

    return { data: (data || []).map(InventoryStockDto.fromDao), error }
  }

  /**
   * Update blocked_qty for a specific inventory stock record.
   * @param {number} id - The inventory_stock record ID
   * @param {number} blockedQty - The new blocked quantity
   * @returns {Promise<{data: object, error: object|null}>}
   */
  async updateBlockedQty(id, blockedQty, inventoryItemId) {
    const { data: stockData, error: stockError } = await supabase
      .from(InventoryStockDao.TABLE)
      .update({ [InventoryStockDao.COLUMNS.blocked]: blockedQty })
      .eq(InventoryStockDao.COLUMNS.id, id)
      .select()

    if (stockError) return { data: null, error: stockError }

    if (inventoryItemId) {
      const { data: allStocks, error: sumError } = await supabase
        .from(InventoryStockDao.TABLE)
        .select(InventoryStockDao.COLUMNS.blocked)
        .eq(InventoryStockDao.COLUMNS.item_id, inventoryItemId)

      if (sumError) return { data: stockData, error: sumError }

      const totalBlocked = allStocks.reduce((sum, s) => sum + (s[InventoryStockDao.COLUMNS.blocked] || 0), 0)
      const { error: itemError } = await supabase
        .from(InventoryItemDao.TABLE)
        .update({ [InventoryItemDao.COLUMNS.blocked]: totalBlocked })
        .eq(InventoryItemDao.COLUMNS.id, inventoryItemId)

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
      .from(InventoryStockDao.TABLE)
      .select(InventoryStockDao.COLUMNS.quantity)
      .eq(InventoryStockDao.COLUMNS.id, id)
      .single()

    if (fetchError) return { data: null, error: fetchError }

    const newQty = Math.max(0, (current.quantity || 0) - reduceBy)
    const { data: stockData, error: stockError } = await supabase
      .from(InventoryStockDao.TABLE)
      .update({ [InventoryStockDao.COLUMNS.quantity]: newQty })
      .eq(InventoryStockDao.COLUMNS.id, id)
      .select()

    if (stockError) return { data: null, error: stockError }

    if (inventoryItemId) {
      const { data: allStocks, error: sumError } = await supabase
        .from(InventoryStockDao.TABLE)
        .select(InventoryStockDao.COLUMNS.quantity)
        .eq(InventoryStockDao.COLUMNS.item_id, inventoryItemId)

      if (!sumError && allStocks) {
        const totalQty = allStocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
        await supabase
          .from(InventoryItemDao.TABLE)
          .update({ [InventoryItemDao.COLUMNS.unit]: totalQty })
          .eq(InventoryItemDao.COLUMNS.id, inventoryItemId)
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
    const categories = new Set(inventoryData.map(item => item.inventory_items?.item_category)).size  // already mapped
    const lowStock = inventoryData.filter(item => item.quantity < 10).length
    return { totalItems, totalStock, categories, lowStock }
  }

  async getItems() {
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .select(InventoryItemDao.SELECT_BRIEF)
      .order(InventoryItemDao.COLUMNS.name, { ascending: true })
    return { data: (data || []).map(InventoryItemDto.fromDao), error }
  }

  async createItem({ name, item_category, item_group }) {
    const dto = new InventoryItemDto({ name, item_category, item_group, blocked_qty: 0, unit: 0 })
    const dbRow = dto.toDao()
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .insert(dbRow)
      .select()
      .single()
    return { data: InventoryItemDto.fromDao(data), error }
  }

  async addStock(item_id, quantity) {
    const { data, error } = await supabase
      .from(InventoryStockDao.TABLE)
      .insert({ [InventoryStockDao.COLUMNS.item_id]: item_id, [InventoryStockDao.COLUMNS.quantity]: quantity, [InventoryStockDao.COLUMNS.blocked]: 0 })
      .select()
      .single()

    if (error) return { data: null, error }

    // Recalculate parent inventory_items quantity
    const { data: allStocks, error: sumError } = await supabase
      .from(InventoryStockDao.TABLE)
      .select(InventoryStockDao.COLUMNS.quantity)
      .eq(InventoryStockDao.COLUMNS.item_id, item_id)

    if (!sumError && allStocks) {
      const totalQty = allStocks.reduce((sum, s) => sum + (s.quantity || 0), 0)
      await supabase
        .from(InventoryItemDao.TABLE)
        .update({ [InventoryItemDao.COLUMNS.unit]: totalQty })
        .eq(InventoryItemDao.COLUMNS.id, item_id)
    }

    return { data, error: null }
  }
}

export const inventoryStockService = new InventoryStockService()
