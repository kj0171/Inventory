import { supabase } from './supabaseClient'
import { InventoryItemDao } from './dao/inventoryItemDao'
import { InventoryItemDto } from './dto/inventoryItemDto'

export class InventoryItemService {
  async getAll() {
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .select(InventoryItemDao.SELECT_FULL)
      .order(InventoryItemDao.COLUMNS.name, { ascending: true })

    return { data: (data || []).map(InventoryItemDto.fromDao), error }
  }

  async getById(id) {
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .select(InventoryItemDao.SELECT_FULL)
      .eq(InventoryItemDao.COLUMNS.id, id)
      .single()

    return { data: data ? InventoryItemDto.fromDao(data) : null, error }
  }

  async findByMatch({ name, item_category, item_group }) {
    let query = supabase
      .from(InventoryItemDao.TABLE)
      .select(InventoryItemDao.SELECT_FULL)
      .ilike(InventoryItemDao.COLUMNS.name, name.trim())

    if (item_category?.trim()) {
      query = query.ilike(InventoryItemDao.COLUMNS.category, item_category.trim())
    } else {
      query = query.is(InventoryItemDao.COLUMNS.category, null)
    }

    if (item_group?.trim()) {
      query = query.ilike(InventoryItemDao.COLUMNS.brand, item_group.trim())
    } else {
      query = query.is(InventoryItemDao.COLUMNS.brand, null)
    }

    const { data, error } = await query.maybeSingle()
    return { data: data ? InventoryItemDto.fromDao(data) : null, error }
  }

  async createItem({ name, item_category, item_group }) {
    const dto = new InventoryItemDto({ name, item_category, item_group, quantity: 0, blocked_qty: 0, unit: '' })
    const { id, ...dbRow } = dto.toDao()
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .insert(dbRow)
      .select()
      .single()

    return { data: data ? InventoryItemDto.fromDao(data) : null, error }
  }

  async addQuantity(itemId, qty) {
    const { data: current, error: fetchError } = await supabase
      .from(InventoryItemDao.TABLE)
      .select(InventoryItemDao.COLUMNS.quantity)
      .eq(InventoryItemDao.COLUMNS.id, itemId)
      .single()

    if (fetchError) return { data: null, error: fetchError }

    const newQty = (current.quantity || 0) + qty
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .update({ [InventoryItemDao.COLUMNS.quantity]: newQty })
      .eq(InventoryItemDao.COLUMNS.id, itemId)
      .select()
      .single()

    return { data: data ? InventoryItemDto.fromDao(data) : null, error }
  }

  async updateBlockedQty(itemId, blockedQty) {
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .update({ [InventoryItemDao.COLUMNS.blocked]: blockedQty })
      .eq(InventoryItemDao.COLUMNS.id, itemId)
      .select()
      .single()

    return { data: data ? InventoryItemDto.fromDao(data) : null, error }
  }

  async reduceQuantity(itemId, reduceBy) {
    const { data: current, error: fetchError } = await supabase
      .from(InventoryItemDao.TABLE)
      .select(`${InventoryItemDao.COLUMNS.quantity}, ${InventoryItemDao.COLUMNS.blocked}`)
      .eq(InventoryItemDao.COLUMNS.id, itemId)
      .single()

    if (fetchError) return { data: null, error: fetchError }

    const newQty = Math.max(0, (current.quantity || 0) - reduceBy)
    const newBlocked = Math.max(0, (current.blocked || 0) - reduceBy)
    const { data, error } = await supabase
      .from(InventoryItemDao.TABLE)
      .update({
        [InventoryItemDao.COLUMNS.quantity]: newQty,
        [InventoryItemDao.COLUMNS.blocked]: newBlocked,
      })
      .eq(InventoryItemDao.COLUMNS.id, itemId)
      .select()
      .single()

    return { data: data ? InventoryItemDto.fromDao(data) : null, error }
  }

  calculateStats(items) {
    const totalItems = items.length
    const totalStock = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    const categories = new Set(items.map(item => item.item_category)).size
    const lowStock = items.filter(item => (item.quantity || 0) < 10).length
    return { totalItems, totalStock, categories, lowStock }
  }
}

export const inventoryItemService = new InventoryItemService()
