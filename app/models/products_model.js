const pool = require('../config/data_base');
const InventoryTransaction = require('./inventory_transactions_model');

class Product {
  
  static async create(data) {
    const { userId, name, description, unitPrice, unitCost, imageUrl, categoryId, unitOfMeasureId, quantity, barcode } = data;
    
    return this.executeWithTransaction(async (client) => {
      // First create the product with zero quantity
      const initialQuantity = 0;
      const { rows } = await client.query(
        `INSERT INTO public.products(
           user_id, name, description, unit_price, unit_cost,
           image_url, category_id, unit_of_measure_id,
           quantity, barcode
         ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [userId, name, description, Number(unitPrice), Number(unitCost), imageUrl, categoryId, unitOfMeasureId, initialQuantity, barcode]
      );
      
      // Then record transaction BEFORE updating the quantity
      if (Number(quantity) > 0) {
        // Record the transaction using centralized method
        await InventoryTransaction.recordTransaction({
          userId,
          productId: rows[0].id,
          quantity: Number(quantity),
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT,
          previousStock: initialQuantity,
          newStock: Number(quantity),
          transactionDate: new Date() // Usar la fecha actual
        }, client);
        
        // Then update the quantity
        await client.query(
          `UPDATE public.products SET quantity = $1 WHERE id = $2`,
          [Number(quantity), rows[0].id]
        );
      }
      
      // Return the product with the updated quantity
      rows[0].quantity = Number(quantity);
      return rows[0];
    });
  }
  
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE user_id = $1 ORDER BY name`,
      [userId]
    );
    return rows;
  }

  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  static async findByNameAndUser(name, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE name = $1 AND user_id = $2`,
      [name, userId]
    );
    return rows[0];
  }

  static async findByBarcodeAndUser(barcode, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.products WHERE barcode = $1 AND user_id = $2`,
      [barcode, userId]
    );
    return rows[0];
  }

  static async update(id, data, userId) {
    return this.executeWithTransaction(async (client) => {
      // Get current product to check if quantity is changing
      const { rows: currentProduct } = await client.query(
        `SELECT * FROM public.products WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      
      if (currentProduct.length === 0) {
        return null;
      }
      
      const oldQuantity = Number(currentProduct[0].quantity);
      const newQuantity = Number(data.quantity);
      
      const values = [
        data.name, data.description, Number(data.unitPrice), Number(data.unitCost),
        data.imageUrl, data.categoryId,
        data.unitOfMeasureId, newQuantity, data.barcode,
        id, userId
      ];
      
      const { rows } = await client.query(
        `UPDATE public.products
         SET name=$1, description=$2, unit_price=$3, unit_cost=$4,
             image_url=$5, category_id=$6,
             unit_of_measure_id=$7, quantity=$8, barcode=$9
         WHERE id=$10 AND user_id=$11 RETURNING *`,
        values
      );
      
      // Record inventory transaction only if quantity has changed
      if (rows.length > 0 && oldQuantity !== newQuantity) {
        const quantityDifference = newQuantity - oldQuantity;
        
        // Record transaction using centralized method
        await InventoryTransaction.recordTransaction({
          userId,
          productId: id,
          quantity: Number(quantityDifference),
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT,
          previousStock: oldQuantity,
          newStock: newQuantity,
          transactionDate: new Date() // Usar la fecha actual
        }, client);
      }
      
      return rows[0];
    });
  }

  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // Check for dependencies first
      const { rows: dependencies } = await client.query(
        `SELECT 
          (SELECT COUNT(*) FROM sales_order_products WHERE product_id = $1) as sales_orders,
          (SELECT COUNT(*) FROM purchase_order_products WHERE product_id = $1) as purchase_orders,
          (SELECT COUNT(*) FROM sales_return_products WHERE product_id = $1) as sales_returns,
          (SELECT COUNT(*) FROM purchase_return_products WHERE product_id = $1) as purchase_returns`,
        [id]
      );

      const deps = dependencies[0];
      if (deps.sales_orders > 0 || deps.purchase_orders > 0 || 
          deps.sales_returns > 0 || deps.purchase_returns > 0) {
        const error = new Error('No se puede eliminar el producto porque está asociado a órdenes o devoluciones');
        error.statusCode = 409;
        error.dependencies = {
          salesOrders: deps.sales_orders,
          purchaseOrders: deps.purchase_orders,
          salesReturns: deps.sales_returns,
          purchaseReturns: deps.purchase_returns
        };
        throw error;
      }

      // Delete the product
      const { rows } = await client.query(
        `DELETE FROM public.products WHERE id=$1 AND user_id=$2 RETURNING *`,
        [id, userId]
      );
      
      return rows[0];
    });
  }

  // Check if product has sufficient stock
  static async hasSufficientStock(productId, requiredQuantity, userId) {
    const { rows } = await pool.query(
      `SELECT quantity FROM public.products
       WHERE id = $1 AND user_id = $2`,
      [productId, userId]
    );
    
    if (rows.length === 0) return false;
    return Number(rows[0].quantity) >= Number(requiredQuantity);
  }

  // Find a product by name (partial match) or barcode (case-insensitive partial match) for a user
  static async findByQueryAndUser(query, userId) {
    const searchTerm = query.trim();
    // Search by barcode (case-insensitive partial match) or name (case-insensitive partial match)
    const { rows } = await pool.query(
      `SELECT id, name, quantity, barcode, unit_price, image_url FROM public.products 
       WHERE user_id = $1 AND (barcode ILIKE $2 OR name ILIKE $3)`,
      [userId, `%${searchTerm}%`, `%${searchTerm}%`]
    );
    return rows;
  }

  // Adjust product quantity directly (for manual adjustments)
  static async adjustQuantity(id, userId, adjustmentQuantity, reason = null) {
    return this.executeWithTransaction(async (client) => {
      // Get current quantity
      const { rows: currentProduct } = await client.query(
        `SELECT quantity FROM public.products WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      
      if (currentProduct.length === 0) {
        return null;
      }
      
      const previousStock = Number(currentProduct[0].quantity);
      const adjustmentQty = Number(adjustmentQuantity);
      const newStock = previousStock + adjustmentQty;
      
      // Update product quantity
      const { rows } = await client.query(
        `UPDATE public.products SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
        [newStock, id, userId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      // Record inventory transaction using centralized method
      const transactionType = adjustmentQty < 0 ? 
        InventoryTransaction.TRANSACTION_TYPES.LOSS : 
        InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT;
      
      await InventoryTransaction.recordTransaction({
        userId,
        productId: id,
        quantity: adjustmentQty,
        transactionTypeId: transactionType,
        previousStock,
        newStock
      }, client);
      
      return rows[0];
    });
  }
  
  // Utility method to execute operations within a transaction
  static async executeWithTransaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Handle specific database constraint errors
      if (error.code === '23514' && error.constraint === 'products_check') {
        const customError = new Error('El precio unitario debe ser mayor al costo unitario');
        customError.statusCode = 400;
        throw customError;
      }
      
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Product;
