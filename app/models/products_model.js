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
        [userId, name, description, unitPrice, unitCost, imageUrl, categoryId, unitOfMeasureId, initialQuantity, barcode]
      );
      
      // Then record transaction BEFORE updating the quantity
      if (quantity > 0) {
        // Record the transaction first with explicit previous_stock=0
        await client.query(
          `INSERT INTO public.inventory_transactions(
            user_id, product_id, quantity, transaction_type_id, 
            previous_stock, new_stock
           ) VALUES($1, $2, $3, $4, $5, $6)`,
          [
            userId, 
            rows[0].id, 
            quantity, 
            InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT,
            initialQuantity,  // Previous stock is 0
            quantity          // New stock is the quantity
          ]
        );
        
        // Then update the quantity
        await client.query(
          `UPDATE public.products SET quantity = $1 WHERE id = $2`,
          [quantity, rows[0].id]
        );
      }
      
      // Return the product with the updated quantity
      rows[0].quantity = quantity;
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
      
      const oldQuantity = currentProduct[0].quantity;
      const newQuantity = data.quantity;
      
      const values = [
        data.name, data.description, data.unitPrice, data.unitCost,
        data.imageUrl, data.categoryId,
        data.unitOfMeasureId, data.quantity, data.barcode,
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
        
        await InventoryTransaction.recordTransaction(client, {
          userId,
          productId: id,
          quantity: quantityDifference,
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT
        });
      }
      
      return rows[0];
    });
  }

  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // Get current product to record quantity removal
      const { rows: currentProduct } = await client.query(
        `SELECT * FROM public.products WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
      
      if (currentProduct.length === 0) {
        return null;
      }
      
      const currentQuantity = currentProduct[0].quantity;
      
      // Record inventory transaction for removing all stock
      if (currentQuantity > 0) {
        await InventoryTransaction.recordTransaction(client, {
          userId,
          productId: id,
          quantity: -currentQuantity, // Negative to remove all stock
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.LOSS
        });
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
        transactionTypeId: transactionType
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
