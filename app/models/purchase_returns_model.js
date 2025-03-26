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
  static async create({ userId, purchaseOrderId, statusId, notes, returnDate, items }) {
    return this.executeWithTransaction(async (client) => {
      // Insert the purchase return record
      const purchaseReturnResult = await client.query(
        `INSERT INTO public.purchase_returns(
           user_id, purchase_order_id, status_id, 
           return_date, notes
         )
         VALUES ($1, $2, $3, COALESCE($4, NOW()), $5)
         RETURNING *`,
        [userId, purchaseOrderId, statusId, returnDate, notes]
      );
      
      const purchaseReturn = purchaseReturnResult.rows[0];
      
      // Get the status name to determine if inventory should be updated
      const statusResult = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      
      const statusName = statusResult.rows[0]?.name;
      const shouldUpdateInventory = statusName === 'confirmed' || statusName === 'completed';
      
      // Insert all the purchase return products
      if (items && items.length > 0) {
        for (const item of items) {
          try {
            const result = await client.query(
              `INSERT INTO public.purchase_return_products(
                 purchase_return_id, product_id, quantity, status_id
               )
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [
                purchaseReturn.id, 
                item.productId, 
                item.quantity, 
                item.statusId || statusId
              ]
            );
            
            const purchaseReturnProductId = result.rows[0].id;
            
            // Update product inventory (decrease stock) if status is 'confirmed' or 'completed'
            if (shouldUpdateInventory) {
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
                transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.PURCHASE_RETURN,
                salesOrderProductId: null,
                purchaseOrderProductId: null
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
      
      return purchaseReturn;
    });
  }

  // Find all purchase returns for a user
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT pr.*, po.id as purchase_order_id, st.name as status_name
       FROM public.purchase_returns pr
       JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
       JOIN public.status_types st ON pr.status_id = st.id
       WHERE pr.user_id = $1 
       ORDER BY pr.return_date DESC`,
      [userId]
    );
    return rows;
  }

  // Find a purchase return by ID
  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT pr.*, po.id as purchase_order_id, st.name as status_name
       FROM public.purchase_returns pr
       JOIN public.purchase_orders po ON pr.purchase_order_id = po.id
       JOIN public.status_types st ON pr.status_id = st.id
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
  static async update(id, { purchaseOrderId, statusId, notes, returnDate, items }, userId) {
    return this.executeWithTransaction(async (client) => {
      // Verify the purchase return exists and belongs to user
      const existingPurchaseReturn = await this.findById(id, userId);
      if (!existingPurchaseReturn) {
        return null;
      }

      // Get the old status name
      const { rows: oldStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [existingPurchaseReturn.status_id]
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
        `SELECT product_id, quantity FROM public.purchase_return_products WHERE purchase_return_id = $1`,
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
        // If changing from confirmed/completed to another status, add products back to inventory
        for (const item of oldItems) {
          await client.query(
            `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
            [item.quantity, item.product_id, userId]
          );
          
          // Record inventory transaction for adding items back
          await InventoryTransaction.recordTransaction(client, {
            userId,
            productId: item.product_id,
            quantity: item.quantity, // Positive for stock increase
            transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT,
            salesOrderProductId: null,
            purchaseOrderProductId: null
          });
        }
      }
      
      // Delete old items
      await client.query(
        `DELETE FROM public.purchase_return_products WHERE purchase_return_id = $1`,
        [id]
      );
      
      // Build the update query
      let updateQuery = `
        UPDATE public.purchase_returns
        SET purchase_order_id = $1, status_id = $2, notes = $3
      `;
      
      const queryParams = [purchaseOrderId, statusId, notes];
      let paramIndex = 4;
      
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
            const result = await client.query(
              `INSERT INTO public.purchase_return_products(
                 purchase_return_id, product_id, quantity, status_id
               )
               VALUES($1, $2, $3, $4)
               RETURNING id`,
              [id, item.productId, item.quantity, item.statusId || statusId]
            );
            
            const purchaseReturnProductId = result.rows[0].id;
            
            // Update inventory based on new status
            if (willBeConfirmed) {
              if (wasConfirmed) {
                // If old status was also confirmed, only subtract the difference from inventory
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
                    transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.PURCHASE_RETURN,
                    salesOrderProductId: null,
                    purchaseOrderProductId: null
                  });
                }
              } else {
                // If changing from another status to confirmed, subtract full quantity
                await client.query(
                  `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
                  [item.quantity, item.productId, userId]
                );
                
                // Record inventory transaction for new confirmed return
                await InventoryTransaction.recordTransaction(client, {
                  userId,
                  productId: item.productId,
                  quantity: -item.quantity, // Negative for decreasing stock
                  transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.PURCHASE_RETURN,
                  salesOrderProductId: null,
                  purchaseOrderProductId: null
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
      
      return purchaseReturn;
    });
  }

  // Delete a purchase return
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // First check the status of the purchase return
      const { rows: returnInfo } = await client.query(
        `SELECT pr.status_id, st.name as status_name 
         FROM public.purchase_returns pr
         JOIN public.status_types st ON pr.status_id = st.id
         WHERE pr.id = $1 AND pr.user_id = $2`,
        [id, userId]
      );
      
      if (!returnInfo.length) {
        return null; // Return doesn't exist or doesn't belong to user
      }
      
      // Get all items from the purchase return
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_return_products WHERE purchase_return_id = $1`,
        [id]
      );
      
      // Only update inventory if the return was confirmed or completed
      const statusName = returnInfo[0].status_name;
      if (statusName === 'confirmed' || statusName === 'completed') {
        // Update inventory for each product (add back to stock)
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
            transactionTypeId: InventoryTransaction.TRANSACTION_TYPES.ADJUSTMENT,
            salesOrderProductId: null,
            purchaseOrderProductId: null
          });
        }
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
