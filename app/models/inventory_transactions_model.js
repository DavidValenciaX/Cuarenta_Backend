const pool = require('../config/data_base');

class InventoryTransaction {
  // Transaction types constants (matching IDs in the database)
  static TRANSACTION_TYPES = {
    CONFIRMED_PURCHASE_ORDER: 1,
    CANCELLED_PURCHASE_ORDER: 2,
    CONFIRMED_SALES_ORDER: 3,
    CANCELLED_SALES_ORDER: 4,
    SALE_RETURN: 5,
    CANCELLED_SALE_RETURN: 6,
    PURCHASE_RETURN: 7,
    CANCELLED_PURCHASE_RETURN: 8,
    ADJUSTMENT: 9,
    LOSS: 10,
  };

  // Record an inventory transaction
  static async recordTransaction(client, {
    userId,
    productId,
    quantity,
    transactionTypeId,
  }) {
    // Get the current stock level
    const { rows: productRows } = await client.query(
      `SELECT quantity FROM public.products WHERE id = $1`,
      [productId]
    );
    
    if (!productRows.length) {
      throw new Error(`Product with ID ${productId} not found`);
    }
    
    const previousStock = parseFloat(productRows[0].quantity);
    const numericQuantity = parseFloat(quantity);
    const newStock = previousStock + numericQuantity;
    
    // Record the transaction
    const { rows } = await client.query(
      `INSERT INTO public.inventory_transactions(
        user_id, product_id, quantity, transaction_type_id,
        previous_stock, new_stock
      )
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        userId,
        productId,
        numericQuantity,
        transactionTypeId,
        previousStock,
        newStock
      ]
    );
    
    return rows[0];
  }

  // Get transaction history for a product
  static async getProductTransactions(productId, userId) {
    const { rows } = await pool.query(
      `SELECT it.*, tt.name as transaction_type_name
       FROM public.inventory_transactions it
       JOIN public.transaction_types tt ON it.transaction_type_id = tt.id
       WHERE it.product_id = $1 AND it.user_id = $2
       ORDER BY it.created_at DESC`,
      [productId, userId]
    );
    return rows;
  }

  // Get all transactions for a user
  static async getUserTransactions(userId, limit = 100, offset = 0) {
    const { rows } = await pool.query(
      `SELECT it.*, tt.name as transaction_type_name, p.name as product_name
       FROM public.inventory_transactions it
       JOIN public.transaction_types tt ON it.transaction_type_id = tt.id
       JOIN public.products p ON it.product_id = p.id
       WHERE it.user_id = $1
       ORDER BY it.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }
}

module.exports = InventoryTransaction;
