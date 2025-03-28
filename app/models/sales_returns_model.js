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
  static async create({ userId, salesOrderId, statusId, notes, returnDate, items }) {
    return this.executeWithTransaction(async (client) => {
      // Insert the sales return record
      const salesReturnResult = await client.query(
        `INSERT INTO public.sales_returns(
           user_id, sales_order_id, status_id, 
           return_date, notes
         )
         VALUES ($1, $2, $3, COALESCE($4, NOW()), $5)
         RETURNING *`,
        [userId, salesOrderId, statusId, returnDate, notes]
      );
      
      const salesReturn = salesReturnResult.rows[0];
      
      // Get the status name to determine if inventory should be updated
      const statusResult = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      
      const statusName = statusResult.rows[0]?.name;
      const shouldUpdateInventory = statusName === 'confirmed';
      
      // Insert all the sales return products
      if (items && items.length > 0) {
        for (const item of items) {
          try {

            // Update product inventory (increase stock) if status is 'confirmed' or 'completed'
            if (shouldUpdateInventory) {
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
            }
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
      `SELECT sr.*, so.id as sales_order_id, st.name as status_name
       FROM public.sales_returns sr
       JOIN public.sales_orders so ON sr.sales_order_id = so.id
       JOIN public.status_types st ON sr.status_id = st.id
       WHERE sr.user_id = $1 
       ORDER BY sr.return_date DESC`,
      [userId]
    );
    return rows;
  }

  // Find a sales return by ID
  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT sr.*, so.id as sales_order_id, st.name as status_name
       FROM public.sales_returns sr
       JOIN public.sales_orders so ON sr.sales_order_id = so.id
       JOIN public.status_types st ON sr.status_id = st.id
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
  static async update(id, { salesOrderId, statusId, notes, returnDate, items }, userId) {
    return this.executeWithTransaction(async (client) => {
      // Verify the sales return exists and belongs to user
      const existingSalesReturn = await this.findById(id, userId);
      if (!existingSalesReturn) {
        return null;
      }

      // Get the old status name
      const { rows: oldStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [existingSalesReturn.status_id]
      );
      const oldStatusName = oldStatusInfo[0]?.name;

      // Get the new status name
      const { rows: newStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      const newStatusName = newStatusInfo[0]?.name;

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
      
      // Handle inventory changes based on status transition
      const wasConfirmed = oldStatusName === 'confirmed' || oldStatusName === 'completed';
      const willBeConfirmed = newStatusName === 'confirmed' || newStatusName === 'completed';
      
      if (wasConfirmed && !willBeConfirmed) {
        // If changing from confirmed/completed to another status, remove products from inventory
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
      }
      
      // Delete old items
      await client.query(
        `DELETE FROM public.sales_return_products WHERE sales_return_id = $1`,
        [id]
      );
      
      // Build the update query
      let updateQuery = `
        UPDATE public.sales_returns
        SET sales_order_id = $1, status_id = $2, notes = $3
      `;
      
      const queryParams = [salesOrderId, statusId, notes];
      let paramIndex = 4;
      
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
      
      // If items are provided, add new items and update inventory
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            
            // Update inventory based on new status
            if (willBeConfirmed) {
              if (wasConfirmed) {
                // If old status was also confirmed, only add the difference to inventory
                const oldQuantity = oldItemsMap[item.productId] || 0;
                const quantityDifference = item.quantity - oldQuantity;
                
                if (quantityDifference !== 0) {
                  await client.query(
                    `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
                    [quantityDifference, item.productId, userId]
                  );
                  
                  // Record inventory transaction for quantity difference
                  await InventoryTransaction.recordTransaction(client, {
                    userId,
                    productId: item.productId,
                    quantity: quantityDifference,
                    transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.SALE_RETURN
                  });
                }
              } else {
                // If changing from another status to confirmed, add full quantity
                await client.query(
                  `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
                  [item.quantity, item.productId, userId]
                );
                
                // Record inventory transaction for new confirmed return
                await InventoryTransaction.recordTransaction(client, {
                  userId,
                  productId: item.productId,
                  quantity: item.quantity, // Positive for increasing stock
                  transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.SALE_RETURN
                });
              }
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
      
      return salesReturn;
    });
  }

  // Delete a sales return
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // First check the status of the sales return
      const { rows: returnInfo } = await client.query(
        `SELECT sr.status_id, st.name as status_name 
         FROM public.sales_returns sr
         JOIN public.status_types st ON sr.status_id = st.id
         WHERE sr.id = $1 AND sr.user_id = $2`,
        [id, userId]
      );
      
      if (!returnInfo.length) {
        return null; // Return doesn't exist or doesn't belong to user
      }
      
      // Get all items from the sales return
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.sales_return_products WHERE sales_return_id = $1`,
        [id]
      );
      
      // Only update inventory if the return was confirmed or completed
      const statusName = returnInfo[0].status_name;
      if (statusName === 'confirmed') {
        // Update inventory for each product (remove from stock)
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
            transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT
          });
        }
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
