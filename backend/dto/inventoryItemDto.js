/**
 * UI-facing representation of an inventory_items record.
 * DB columns (category, brand, blocked) are mapped to UI names (item_category, item_group, blocked_qty).
 */
export class InventoryItemDto {
  /**
   * @param {object} [props]
   * @param {string|null}  props.id
   * @param {string}       props.name
   * @param {string}       props.item_category
   * @param {string}       props.item_group
   * @param {number}       props.quantity
   * @param {number}       props.blocked_qty
   * @param {string}       props.unit
   */
  constructor(props = {}) {
    this.id = props.id ?? null
    this.name = props.name ?? ''
    this.item_category = props.item_category ?? ''
    this.item_group = props.item_group ?? ''
    this.quantity = props.quantity ?? 0
    this.blocked_qty = props.blocked_qty ?? 0
    this.unit = props.unit ?? ''
  }

  /** Map a DB row to a DTO instance */
  static fromDao(row) 
  {
    if (!row) 
        return row
    
    const { category, brand, blocked, ...rest } = row
    return new InventoryItemDto({
      ...rest,
      item_category: category,
      item_group: brand,
      blocked_qty: blocked,
    })
  }

  /** Map this DTO back to a DB-shaped object */
  toDao() {
    const { item_category, item_group, blocked_qty, ...rest } = this
    return {
      ...rest,
      ...(item_category !== undefined && { category: item_category }),
      ...(item_group !== undefined && { brand: item_group }),
      ...(blocked_qty !== undefined && { blocked: blocked_qty }),
    }
  }
}
