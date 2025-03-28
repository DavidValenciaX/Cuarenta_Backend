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

  // Record an inventory transaction with correct previous and new stock values
  static async recordTransaction(client, data) {
    const { userId, productId, quantity, transactionTypeId, previousStock: providedPreviousStock, newStock: providedNewStock } = data;
    
    let previousStock, newStock;
    
    // If previousStock and newStock are provided, use them
    if (providedPreviousStock !== undefined && providedNewStock !== undefined) {
      previousStock = Number(providedPreviousStock);
      newStock = Number(providedNewStock);
    } else {
      // Otherwise query the current stock level from products table
      const { rows } = await client.query(
        `SELECT quantity FROM public.products WHERE id = $1 AND user_id = $2`,
        [productId, userId]
      );
      
      if (rows.length === 0) {
        throw new Error(`Product with ID ${productId} not found`);
      }
      
      // Get the current stock level
      previousStock = Number(rows[0].quantity);
      
      // Calculate the new stock level
      newStock = previousStock + Number(quantity);
    }
    
    // Insert the transaction with accurate stock levels
    const result = await client.query(
      `INSERT INTO public.inventory_transactions(
        user_id, product_id, quantity, transaction_type_id, 
        previous_stock, new_stock
      ) VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, productId, Number(quantity), transactionTypeId, previousStock, newStock]
    );
    
    return result.rows[0];
  }

  static async getTransactionHistoryByProduct(productId, userId) {
    const { rows } = await pool.query(
      `SELECT it.*, tt.name as transaction_type_name, p.name as product_name
       FROM public.inventory_transactions it
       JOIN public.transaction_types tt ON it.transaction_type_id = tt.id
       JOIN public.products p ON it.product_id = p.id
       WHERE it.product_id = $1 AND it.user_id = $2
       ORDER BY it.created_at DESC`,
      [productId, userId]
    );
    return rows;
  }

  static async getTransactionHistory(userId) {
    const { rows } = await pool.query(
      `SELECT it.*, tt.name as transaction_type_name, p.name as product_name
       FROM public.inventory_transactions it
       JOIN public.transaction_types tt ON it.transaction_type_id = tt.id
       JOIN public.products p ON it.product_id = p.id
       WHERE it.user_id = $1
       ORDER BY it.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getUserTransactions(userId, limit, offset) {
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
