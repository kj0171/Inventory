/**
 * UI-facing representation of an inventory_stock record.
 * DB column (blocked) is mapped to UI name (blocked_qty).
 * Nested inventory_items are mapped via InventoryItemDto.
 */
import { InventoryItemDto } from './inventoryItemDto'

export class InventoryStockDto {
  /**
   * @param {object} [props]
   * @param {string|null}           props.id
   * @param {string|null}           props.item_id
   * @param {number}                props.quantity
   * @param {number}                props.blocked_qty
   * @param {string|null}           props.created_at
   * @param {InventoryItemDto|null} props.inventory_items
   */
  constructor(props = {}) {
    this.id = props.id ?? null
    this.item_id = props.item_id ?? null
    this.quantity = props.quantity ?? 0
    this.blocked_qty = props.blocked_qty ?? 0
    this.created_at = props.created_at ?? null
    this.inventory_items = props.inventory_items ?? null
  }

  /** Map a DB row (with optional joined inventory_items) to a DTO instance */
  static fromDao(row) {
    if (!row) return row
    const { blocked, inventory_items, ...rest } = row
    return new InventoryStockDto({
      ...rest,
      blocked_qty: blocked,
      inventory_items: inventory_items ? InventoryItemDto.fromDao(inventory_items) : null,
    })
  }

  /** Map this DTO back to a DB-shaped object */
  toDao() {
    const { blocked_qty, inventory_items, ...rest } = this
    return {
      ...rest,
      ...(blocked_qty !== undefined && { blocked: blocked_qty }),
    }
  }
}
