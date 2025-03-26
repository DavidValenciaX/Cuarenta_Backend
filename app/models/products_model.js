const pool = require('../config/data_base');
const InventoryTransaction = require('./inventory_transactions_model');

class Product {
  
  static async create(data) {
    const { userId, name, description, unitPrice, unitCost, imageUrl, categoryId, unitOfMeasureId, quantity, barcode } = data;
    const { rows } = await pool.query(
      `INSERT INTO public.products(
         user_id, name, description, unit_price, unit_cost,
         image_url, category_id, unit_of_measure_id,
         quantity, barcode
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [userId, name, description, unitPrice, unitCost, imageUrl, categoryId, unitOfMeasureId, quantity, barcode]
    );
    return rows[0];
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
    const values = [
      data.name, data.description, data.unitPrice, data.unitCost,
      data.imageUrl, data.categoryId,
      data.unitOfMeasureId, data.quantity, data.barcode,
      id, userId
    ];
    const { rows } = await pool.query(
      `UPDATE public.products
       SET name=$1, description=$2, unit_price=$3, unit_cost=$4,
           image_url=$5, category_id=$6,
           unit_of_measure_id=$7, quantity=$8, barcode=$9
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      values
    );
    return rows[0];
  }

  static async delete(id, userId) {
    const { rows } = await pool.query(
      `DELETE FROM public.products WHERE id=$1 AND user_id=$2 RETURNING *`,
      [id, userId]
    );
    return rows[0];
  }

  // Check if product has sufficient stock
  static async hasSufficientStock(productId, requiredQuantity, userId) {
    const { rows } = await pool.query(
      `SELECT quantity FROM public.products
       WHERE id = $1 AND user_id = $2`,
      [productId, userId]
    );
    
    if (rows.length === 0) return false;
    return rows[0].quantity >= requiredQuantity;
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
      
      const previousStock = currentProduct[0].quantity;
      const newStock = previousStock + adjustmentQuantity;
      
      // Update product quantity
      const { rows } = await client.query(
        `UPDATE public.products SET quantity = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
        [newStock, id, userId]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      // Record inventory transaction
      const transactionType = adjustmentQuantity < 0 
        ? InventoryTransaction.TRANSACTION_TYPES.LOSS 
        : InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT;
        
      await InventoryTransaction.recordTransaction(client, {
        userId,
        productId: id,
        quantity: adjustmentQuantity,
        transactionTypeId: transactionType,
        salesOrderProductId: null,
        purchaseOrderProductId: null
      });
      
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
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Product;
