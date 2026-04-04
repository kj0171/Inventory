import { TABLES } from '../constants'

export class InventoryItemDao {
  static TABLE = TABLES.INVENTORY_ITEMS

  static COLUMNS = {
    id: 'id',
    name: 'name',
    brand: 'brand',
    category: 'category',
    quantity: 'quantity',
    blocked: 'blocked',
    unit: 'unit',
  }

  static SELECT_BRIEF = 'id, name, category, brand'
  static SELECT_FULL = 'id, name, category, brand, quantity, blocked, unit'
}
