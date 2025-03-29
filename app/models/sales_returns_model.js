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

            // Check if the status is 'accepted' before updating inventory
            const statusResult = await client.query(
              `SELECT name FROM public.status_types WHERE id = $1`,
              [item.statusId]
            );
            
            if (statusResult.rows.length > 0 && statusResult.rows[0].name === 'accepted') {
              // Only update inventory for products with 'accepted' status
              const productResult = await client.query(
                `UPDATE public.products
                 SET quantity = quantity + $1
                 WHERE id = $2 AND user_id = $3
                 RETURNING quantity`,
                [Number(item.quantity), item.productId, userId]
              );
              
              if (!productResult.rows.length) {
                throw new Error(`No se pudo actualizar inventario para producto ${item.productId}`);
              }
              
              const currentStock = Number(productResult.rows[0].quantity);
              const previousStock = currentStock - Number(item.quantity);
              
              // Record the transaction using the centralized method
              await InventoryTransaction.recordTransaction({
                userId, 
                productId: item.productId, 
                quantity: Number(item.quantity), 
                transactionTypeId: 5, // SALE_RETURN
                previousStock,
                newStock: currentStock
              }, client);
            }
            // If status is 'under_review' or 'damaged', no inventory update is made
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
      for (const item of oldItems) {
        const productResult = await client.query(
          `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
          [Number(item.quantity), item.product_id, userId]
        );
        
        const currentStock = Number(productResult.rows[0].quantity);
        const previousStock = currentStock + Number(item.quantity);
        
        // Record adjustment transaction using centralized method
        await InventoryTransaction.recordTransaction({
          userId,
          productId: item.product_id,
          quantity: -Number(item.quantity),
          transactionTypeId: 9, // ADJUSTMENT
          previousStock,
          newStock: currentStock
        }, client);
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
            const productResult = await client.query(
              `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
              [Number(item.quantity), item.productId, userId]
            );
            
            const currentStock = Number(productResult.rows[0].quantity);
            const previousStock = currentStock - Number(item.quantity);
            
            // Record sale return transaction using centralized method
            await InventoryTransaction.recordTransaction({
              userId,
              productId: item.productId,
              quantity: Number(item.quantity),
              transactionTypeId: 5, // SALE_RETURN
              previousStock,
              newStock: currentStock
            }, client);
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
      // Get all items from the sales return including status_id
      const { rows: items } = await client.query(
        `SELECT srp.product_id, srp.quantity, srp.status_id, st.name as status_name
         FROM public.sales_return_products srp
         LEFT JOIN public.status_types st ON srp.status_id = st.id
         WHERE srp.sales_return_id = $1`,
        [id]
      );
      
      // Update inventory only for products with "accepted" status
      for (const { product_id, quantity, status_name } of items) {
        // Only adjust inventory if status was "accepted"
        if (status_name === 'accepted') {
          const productResult = await client.query(
            `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
            [Number(quantity), product_id, userId]
          );
          
          const currentStock = Number(productResult.rows[0].quantity);
          const previousStock = currentStock + Number(quantity);
          
          // Record cancelled sale return transaction using centralized method
          await InventoryTransaction.recordTransaction({
            userId,
            productId: product_id,
            quantity: -Number(quantity),
            transactionTypeId: 6, // CANCELLED_SALE_RETURN
            previousStock,
            newStock: currentStock
          }, client);
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
