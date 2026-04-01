import { TABLES } from '../constants'
import { InventoryItemDao } from './inventoryItemDao'

export class InventoryStockDao {
  static TABLE = TABLES.INVENTORY_STOCK

  static COLUMNS = {
    id: 'id',
    item_id: 'item_id',
    quantity: 'quantity',
    blocked: 'blocked',
    created_at: 'created_at',
  }

  static SELECT_WITH_ITEM = `
    id,
    quantity,
    blocked,
    created_at,
    item_id,
    ${InventoryItemDao.TABLE} (
      name,
      category,
      brand
    )
  `
}
