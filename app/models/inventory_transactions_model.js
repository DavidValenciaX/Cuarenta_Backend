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

  /**
   * Records an inventory transaction
   * @param {Object} transaction - The transaction details
   * @param {number} transaction.userId - User ID
   * @param {number} transaction.productId - Product ID
   * @param {number} transaction.quantity - Quantity change (positive or negative)
   * @param {number} transaction.transactionTypeId - Transaction type ID
   * @param {number} transaction.previousStock - Previous stock level
   * @param {number} transaction.newStock - New stock level
   * @param {Object} [client] - Optional database client for transaction support
   * @returns {Promise<Object>} The created transaction
   */
  static async recordTransaction({
    userId, 
    productId, 
    quantity, 
    transactionTypeId, 
    previousStock, 
    newStock
  }, client = null) {
    const query = `
      INSERT INTO public.inventory_transactions(
        user_id, product_id, quantity, transaction_type_id, 
        previous_stock, new_stock
      ) VALUES($1, $2, $3, $4, $5, $6)
      RETURNING *`;
    const values = [userId, productId, Number(quantity), transactionTypeId, previousStock, newStock];
    
    // If a client is provided, use it (for transaction support)
    if (client) {
      const { rows } = await client.query(query, values);
      return rows[0];
    } else {
      // Otherwise use the pool directly
      const { rows } = await pool.query(query, values);
      return rows[0];
    }
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

  /**
   * Get confirmed sales transactions grouped by product for all users.
   * Returns: [{ product_id, sales: [{date, quantity}], stock }]
   */
  static async getConfirmedSalesByProduct() {
    // 1. Obtener todas las transacciones de tipo "confirmed_sales_order" (id=3) de todos los usuarios
    // 2. Agrupar por producto y fecha
    // 3. Obtener el stock actual de cada producto
    const salesQuery = `
      SELECT 
        it.product_id, 
        DATE(it.created_at) as date, 
        SUM(ABS(it.quantity)) as quantity
      FROM public.inventory_transactions it
      WHERE it.transaction_type_id = $1
      GROUP BY it.product_id, DATE(it.created_at)
      ORDER BY it.product_id, date
    `;
    const salesResult = await pool.query(salesQuery, [InventoryTransaction.TRANSACTION_TYPES.CONFIRMED_SALES_ORDER]);

    // Agrupar ventas por producto
    const salesByProduct = {};
    for (const row of salesResult.rows) {
      const pid = Number(row.product_id);
      if (!salesByProduct[pid]) {
        salesByProduct[pid] = [];
      }
      salesByProduct[pid].push({
        date: row.date,
        quantity: Number(row.quantity)
      });
    }

    // Obtener el stock actual de todos los productos involucrados
    const productIds = Object.keys(salesByProduct);
    let stocks = {};
    if (productIds.length > 0) {
      const stockQuery = `
        SELECT id as product_id, quantity as stock
        FROM public.products
        WHERE id = ANY($1::int[])
      `;
      const stockResult = await pool.query(stockQuery, [productIds]);
      for (const row of stockResult.rows) {
        stocks[Number(row.product_id)] = Number(row.stock);
      }
    }

    // Construir el resultado final
    const result = [];
    for (const pid of productIds) {
      result.push({
        product_id: Number(pid),
        sales: salesByProduct[pid],
        stock: stocks[pid] ?? null
      });
    }
    return result;
  }
}

module.exports = InventoryTransaction;
