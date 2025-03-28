const pool = require('../config/data_base');
const InventoryTransaction = require('./inventory_transactions_model');

class SalesReturn {
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

  // Create a sales return with its items
  static async create({ userId, salesOrderId, notes, returnDate, items }) {
    return this.executeWithTransaction(async (client) => {
      // Insert the sales return record - status is no longer needed as all returns are confirmed
      const salesReturnResult = await client.query(
        `INSERT INTO public.sales_returns(
           user_id, sales_order_id, 
           return_date, notes
         )
         VALUES ($1, $2, COALESCE($3, NOW()), $4)
         RETURNING *`,
        [userId, salesOrderId, returnDate, notes]
      );
      
      const salesReturn = salesReturnResult.rows[0];
      
      // Insert all the sales return products
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            // Insert the sales return product with its status
            await client.query(
              `INSERT INTO public.sales_return_products(
                 sales_return_id, product_id, quantity, status_id
               )
               VALUES ($1, $2, $3, $4)`,
              [salesReturn.id, item.productId, item.quantity, item.statusId]
            );

            // All returns are now considered confirmed, so always update inventory
            const productResult = await client.query(
              `UPDATE public.products
               SET quantity = quantity + $1
               WHERE id = $2 AND user_id = $3
               RETURNING quantity`,
              [item.quantity, item.productId, userId]
            );
            
            if (!productResult.rows.length) {
              throw new Error(`No se pudo actualizar inventario para producto ${item.productId}`);
            }
            
            // Record inventory transaction for sale return
            await InventoryTransaction.recordTransaction(client, {
              userId,
              productId: item.productId,
              quantity: item.quantity, // Positive for returns (stock increase)
              transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.SALE_RETURN
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
      
      return salesReturn;
    });
  }

  // Find all sales returns for a user
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT sr.*, so.id as sales_order_id
       FROM public.sales_returns sr
       JOIN public.sales_orders so ON sr.sales_order_id = so.id
       WHERE sr.user_id = $1 
       ORDER BY sr.return_date DESC`,
      [userId]
    );
    return rows;
  }

  // Find a sales return by ID
  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT sr.*, so.id as sales_order_id
       FROM public.sales_returns sr
       JOIN public.sales_orders so ON sr.sales_order_id = so.id
       WHERE sr.id = $1 AND sr.user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  // Get items for a sales return
  static async getItems(salesReturnId, userId) {
    const { rows } = await pool.query(
      `SELECT srp.*, p.name as product_name, p.description as product_description,
              st.name as status_name
       FROM public.sales_return_products srp
       JOIN public.products p ON srp.product_id = p.id
       JOIN public.sales_returns sr ON srp.sales_return_id = sr.id
       LEFT JOIN public.status_types st ON srp.status_id = st.id
       WHERE srp.sales_return_id = $1 AND sr.user_id = $2`,
      [salesReturnId, userId]
    );
    return rows;
  }

  // Update a sales return
  static async update(id, { salesOrderId, notes, returnDate, items }, userId) {
    return this.executeWithTransaction(async (client) => {
      // Verify the sales return exists and belongs to user
      const existingSalesReturn = await this.findById(id, userId);
      if (!existingSalesReturn) {
        return null;
      }

      // Get existing items
      const { rows: oldItems } = await client.query(
        `SELECT product_id, quantity FROM public.sales_return_products WHERE sales_return_id = $1`,
        [id]
      );
      
      // Create a mapping of old items by product_id for quick lookup
      const oldItemsMap = {};
      oldItems.forEach(item => {
        oldItemsMap[item.product_id] = item.quantity;
      });
      
      // Since all returns are considered confirmed, we need to reverse previous inventory changes
      // before applying new ones
      for (const item of oldItems) {
        await client.query(
          `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
          [item.quantity, item.product_id, userId]
        );
        
        // Record inventory transaction for removing items
        await InventoryTransaction.recordTransaction(client, {
          userId,
          productId: item.product_id,
          quantity: -item.quantity, // Negative for stock decrease
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT
        });
      }
      
      // Delete old items
      await client.query(
        `DELETE FROM public.sales_return_products WHERE sales_return_id = $1`,
        [id]
      );
      
      // Build the update query - no more status_id
      let updateQuery = `
        UPDATE public.sales_returns
        SET sales_order_id = $1, notes = $2
      `;
      
      const queryParams = [salesOrderId, notes];
      let paramIndex = 3;
      
      // Add returnDate to the query if provided
      if (returnDate) {
        updateQuery += `, return_date = $${paramIndex}`;
        queryParams.push(returnDate);
        paramIndex++;
      }
      
      updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      queryParams.push(id, userId);
      
      const salesReturnResult = await client.query(updateQuery, queryParams);
      
      if (salesReturnResult.rows.length === 0) {
        return null;
      }
      
      const salesReturn = salesReturnResult.rows[0];
      
      // Add new items and update inventory
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            // Insert the new item with status
            await client.query(
              `INSERT INTO public.sales_return_products(
                sales_return_id, product_id, quantity, status_id
              )
              VALUES ($1, $2, $3, $4)`,
              [id, item.productId, item.quantity, item.statusId]
            );
            
            // Always update inventory since all returns are confirmed
            await client.query(
              `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
              [item.quantity, item.productId, userId]
            );
            
            // Record inventory transaction
            await InventoryTransaction.recordTransaction(client, {
              userId,
              productId: item.productId,
              quantity: item.quantity,
              transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.SALE_RETURN
            });
          } catch (error) {
            // Handle unique constraint violation
            if (error.code === '23505') {
              throw new Error(`El producto ${item.productId} ya está incluido en esta devolución`);
            }
            throw error;
          }
        }
      }
      
      return salesReturn;
    });
  }

  // Delete a sales return
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // Get all items from the sales return
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.sales_return_products WHERE sales_return_id = $1`,
        [id]
      );
      
      // Update inventory for each product (remove from stock) since all returns are considered confirmed
      for (const { product_id, quantity } of items) {
        await client.query(
          `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
          [quantity, product_id, userId]
        );
        
        // Record inventory transaction for removing items from stock
        await InventoryTransaction.recordTransaction(client, {
          userId,
          productId: product_id,
          quantity: -quantity, // Negative for stock decrease
          transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.CANCELLED_SALE_RETURN
        });
      }
      
      // Delete the sales return (will cascade delete its items)
      const { rows } = await client.query(
        `DELETE FROM public.sales_returns WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );
      
      return rows[0];
    });
  }

  // Validate sales order and check if it belongs to user
  static async validateSalesOrder(salesOrderId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, userId]
    );
    return rows[0];
  }
}

module.exports = SalesReturn;
