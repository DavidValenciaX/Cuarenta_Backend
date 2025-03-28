const pool = require('../config/data_base');
const InventoryTransaction = require('./inventory_transactions_model');

class PurchaseReturn {
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

  // Create a purchase return with its items
  static async create({ userId, purchaseOrderId, notes, returnDate, items }) {
    return this.executeWithTransaction(async (client) => {
      // Insert the purchase return record
      const purchaseReturnResult = await client.query(
        `INSERT INTO public.purchase_returns(
           user_id, purchase_order_id,
           return_date, notes
         )
         VALUES ($1, $2, COALESCE($3, NOW()), $4)
         RETURNING *`,
        [userId, purchaseOrderId, returnDate, notes]
      );
      
      const purchaseReturn = purchaseReturnResult.rows[0];
      
      // Insert all the purchase return products
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            // Insert the purchase return product record with its status
            await client.query(
              `INSERT INTO public.purchase_return_products(
                purchase_return_id, product_id, quantity, status_id
              )
              VALUES ($1, $2, $3, $4)`,
              [purchaseReturn.id, item.productId, item.quantity, item.statusId]
            );

            // Always update product inventory (decrease stock)
            const productResult = await client.query(
              `UPDATE public.products
               SET quantity = quantity - $1
               WHERE id = $2 AND user_id = $3
               RETURNING quantity`,
              [item.quantity, item.productId, userId]
            );
            
            if (!productResult.rows.length) {
              throw new Error(`No se pudo actualizar inventario para producto ${item.productId}`);
            }
            
            // Record inventory transaction for purchase return
            await InventoryTransaction.recordTransaction(client, {
              userId,
              productId: item.productId,
              quantity: -item.quantity, // Negative for returning to supplier
              transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.PURCHASE_RETURN
            });
          } catch (error) {
            // Handle unique constraint violation
            if (error.code === '23505') { // unique_violation PostgreSQL error code
              throw new Error(`El producto ${item.productId} ya está incluido en esta devolución`);
            }
            throw error;
          }
        }
      }
      
      return purchaseReturn;
    });
  }

  // Find all purchase returns for a user
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT pr.*, po.id as purchase_order_id
       FROM public.purchase_returns pr
       JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
       WHERE pr.user_id = $1 
       ORDER BY pr.return_date DESC`,
      [userId]
    );
    return rows;
  }

  // Find a purchase return by ID
  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT pr.*, po.id as purchase_order_id
       FROM public.purchase_returns pr
       JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
       WHERE pr.id = $1 AND pr.user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  // Get items for a purchase return
  static async getItems(purchaseReturnId, userId) {
    const { rows } = await pool.query(
      `SELECT prp.*, p.name as product_name, p.description as product_description,
              st.name as status_name
       FROM public.purchase_return_products prp
       JOIN public.products p ON prp.product_id = p.id
       JOIN public.purchase_returns pr ON prp.purchase_return_id = pr.id
       LEFT JOIN public.status_types st ON prp.status_id = st.id
       WHERE prp.purchase_return_id = $1 AND pr.user_id = $2`,
      [purchaseReturnId, userId]
    );
    return rows;
  }

  // Update a purchase return
  static async update(id, { purchaseOrderId, notes, returnDate, items }, userId) {
    return this.executeWithTransaction(async (client) => {
      // Verify the purchase return exists and belongs to user
      const existingPurchaseReturn = await this.findById(id, userId);
      if (!existingPurchaseReturn) {
        return null;
      }

      // Get existing items
      const { rows: oldItems } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_return_products WHERE purchase_return_id = $1`,
        [id]
      );
      
      // Create a mapping of old items by product_id for quick lookup
      const oldItemsMap = {};
      oldItems.forEach(item => {
        oldItemsMap[item.product_id] = item.quantity;
      });
      
      // Delete old items
      await client.query(
        `DELETE FROM public.purchase_return_products WHERE purchase_return_id = $1`,
        [id]
      );
      
      // Build the update query
      let updateQuery = `
        UPDATE public.purchase_returns
        SET purchase_order_id = $1, notes = $2
      `;
      
      const queryParams = [purchaseOrderId, notes];
      let paramIndex = 3;
      
      // Add returnDate to the query if provided
      if (returnDate) {
        updateQuery += `, return_date = $${paramIndex}`;
        queryParams.push(returnDate);
        paramIndex++;
      }
      
      updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      queryParams.push(id, userId);
      
      const purchaseReturnResult = await client.query(updateQuery, queryParams);
      
      if (purchaseReturnResult.rows.length === 0) {
        return null;
      }
      
      const purchaseReturn = purchaseReturnResult.rows[0];
      
      // If items are provided, add new items and update inventory
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            // Insert the purchase return product with its status
            await client.query(
              `INSERT INTO public.purchase_return_products(
                purchase_return_id, product_id, quantity, status_id
              )
              VALUES ($1, $2, $3, $4)`,
              [id, item.productId, item.quantity, item.statusId]
            );
            
            // Calculate inventory adjustment needed
            const oldQuantity = oldItemsMap[item.productId] || 0;
            const quantityDifference = item.quantity - oldQuantity;
            
            if (quantityDifference !== 0) {
              await client.query(
                `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
                [quantityDifference, item.productId, userId]
              );
              
              // Record inventory transaction for quantity difference
              await InventoryTransaction.recordTransaction(client, {
                userId,
                productId: item.productId,
                quantity: -quantityDifference, // Negative for decreasing stock
                transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT
              });
            }
          } catch (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
              throw new Error(`El producto ${item.productId} ya está incluido en esta devolución`);
            }
            throw error;
          }
        }
      }
      
      return purchaseReturn;
    });
  }

  // Delete a purchase return
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // Get all items from the purchase return
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_return_products WHERE purchase_return_id = $1`,
        [id]
      );
      
      // Update inventory for each product (add back to stock) since all returns are confirmed
      for (const { product_id, quantity } of items) {
        await client.query(
          `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
          [quantity, product_id, userId]
        );
        
        // Record inventory transaction for adding items back to stock
        await InventoryTransaction.recordTransaction(client, {
          userId,
          productId: product_id,
          quantity: quantity, // Positive for stock increase
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.CANCELLED_PURCHASE_RETURN
        });
      }
      
      // Delete the purchase return (will cascade delete its items)
      const { rows } = await client.query(
        `DELETE FROM public.purchase_returns WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );
      
      return rows[0];
    });
  }

  // Validate purchase order and check if it belongs to user
  static async validatePurchaseOrder(purchaseOrderId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.purchase_orders WHERE id = $1 AND user_id = $2`,
      [purchaseOrderId, userId]
    );
    return rows[0];
  }
}

module.exports = PurchaseReturn;
