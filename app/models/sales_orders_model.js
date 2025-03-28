const pool = require('../config/data_base');

class SalesOrder {
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

  // Create a sales order with its products
  static async create({ userId, customerId, statusId, totalAmount, salesOrderDate, notes, items }) {
    // Execute within a transaction
    return this.executeWithTransaction(async (client) => {
      // Insert the sales order
      const salesOrderResult = await client.query(
        `INSERT INTO public.sales_orders(user_id, customer_id, status_id, total_amount, sales_order_date, notes)
         VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6)
         RETURNING *`,
        [userId, customerId, statusId, totalAmount, salesOrderDate, notes]
      );
      
      const salesOrder = salesOrderResult.rows[0];
      
      // Get the status name to determine if inventory should be updated
      const statusResult = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      
      const statusName = statusResult.rows[0]?.name;
      const shouldUpdateInventory = statusName === 'confirmed';
      
      // Insert all the sales order products
      if (items && items.length > 0) {
        for (const item of items) {

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

            // Record the inventory transaction directly with SQL
            const currentStock = Number(productResult.rows[0].quantity);
            const previousStock = currentStock + Number(item.quantity);
            
            await client.query(
              `INSERT INTO public.inventory_transactions(
                user_id, product_id, quantity, transaction_type_id, 
                previous_stock, new_stock
              ) VALUES($1, $2, $3, $4, $5, $6)`,
              [userId, item.productId, -item.quantity, 3, previousStock, currentStock]
            );
          }
        }
      }
      
      return salesOrder;
    });
  }

  // Find all sales orders for a user
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT so.*, c.name as customer_name, st.name as status_name
       FROM public.sales_orders so
       JOIN public.customers c ON so.customer_id = c.id
       JOIN public.status_types st ON so.status_id = st.id
       WHERE so.user_id = $1 
       ORDER BY so.sales_order_date DESC`,
      [userId]
    );
    return rows;
  }

  // Find a sales order by ID
  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT so.*, c.name as customer_name, st.name as status_name
       FROM public.sales_orders so
       JOIN public.customers c ON so.customer_id = c.id
       JOIN public.status_types st ON so.status_id = st.id
       WHERE so.id = $1 AND so.user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  // Get products for a sales order
  static async getProducts(salesOrderId, userId) {
    const { rows } = await pool.query(
      `SELECT sop.*, p.name as product_name, p.description as product_description
       FROM public.sales_order_products sop
       JOIN public.products p ON sop.product_id = p.id
       JOIN public.sales_orders so ON sop.sales_order_id = so.id
       WHERE sop.sales_order_id = $1 AND so.user_id = $2`,
      [salesOrderId, userId]
    );
    return rows;
  }

  // Update a sales order
  static async update(id, { customerId, statusId, salesOrderDate, totalAmount, notes, items }, userId) {
    return this.executeWithTransaction(async (client) => {
      // Verify the sales order exists and belongs to user
      const existingSalesOrder = await this.findById(id, userId);
      if (!existingSalesOrder) {
        return null;
      }

      // Get the old status name
      const { rows: oldStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [existingSalesOrder.status_id]
      );
      const oldStatusName = oldStatusInfo[0]?.name;

      // Get the new status name
      const { rows: newStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      const newStatusName = newStatusInfo[0]?.name;
      
      // Prevent changing from confirmed to any other status
      if (oldStatusName === 'confirmed' && newStatusName !== 'pending') {
        throw new Error('No se puede cambiar una orden de venta de "confirmado" a "pendiente".');
      }

      // Get existing items
      const { rows: oldItems } = await client.query(
        `SELECT product_id, quantity FROM public.sales_order_products WHERE sales_order_id = $1`,
        [id]
      );
      
      // Create a mapping of old items by product_id for quick lookup
      const oldItemsMap = {};
      oldItems.forEach(item => {
        oldItemsMap[item.product_id] = item.quantity;
      });
      
      // Delete old items
      await client.query(
        `DELETE FROM public.sales_order_products WHERE sales_order_id = $1`,
        [id]
      );
      
      // Build the update query
      let updateQuery = `
        UPDATE public.sales_orders
        SET customer_id = $1, status_id = $2, total_amount = $3, notes = $4
      `;
      
      const queryParams = [customerId, statusId, totalAmount, notes];
      let paramIndex = 5;
      
      // Add salesOrderDate to the query if provided
      if (salesOrderDate) {
        updateQuery += `, sales_order_date = $${paramIndex}`;
        queryParams.push(salesOrderDate);
        paramIndex++;
      }
      
      updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      queryParams.push(id, userId);
      
      const salesOrderResult = await client.query(updateQuery, queryParams);
      
      if (salesOrderResult.rows.length === 0) {
        return null;
      }
      
      const salesOrder = salesOrderResult.rows[0];
      
      // If items are provided, add new items and update inventory
      if (items && items.length > 0) {
        for (const item of items) {

          // Update inventory based on new status
          if (newStatusName === 'confirmed') {
            // If old status was also confirmed, only remove the difference from inventory
            if (oldStatusName === 'confirmed') {
              const oldQuantity = oldItemsMap[item.productId] || 0;
              const quantityDifference = item.quantity - oldQuantity;
              
              if (quantityDifference !== 0) {
                const productResult = await client.query(
                  `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
                  [quantityDifference, item.productId, userId]
                );
                
                const currentStock = productResult.rows[0].quantity;
                const previousStock = currentStock + parseFloat(quantityDifference);

                // Direct SQL insert for adjustment transaction
                await client.query(
                  `INSERT INTO public.inventory_transactions(
                    user_id, product_id, quantity, transaction_type_id, 
                    previous_stock, new_stock
                  ) VALUES($1, $2, $3, $4, $5, $6)`,
                  [userId, item.productId, -quantityDifference, 9, previousStock, currentStock]
                );
              }
            } else {
              // If changing from another status to confirmed, remove full quantity
              const productResult = await client.query(
                `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
                [item.quantity, item.productId, userId]
              );
              
              const currentStock = productResult.rows[0].quantity;
              const previousStock = currentStock + parseFloat(item.quantity);

              // Direct SQL insert for confirmed sales order
              await client.query(
                `INSERT INTO public.inventory_transactions(
                  user_id, product_id, quantity, transaction_type_id, 
                  previous_stock, new_stock
                ) VALUES($1, $2, $3, $4, $5, $6)`,
                [userId, item.productId, -item.quantity, 3, previousStock, currentStock]
              );
            }
          }
        }
      }
      
      return salesOrder;
    });
  }

  // Delete a sales order and its products (leveraging CASCADE)
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // First check the status of the sales order
      const { rows: orderInfo } = await client.query(
        `SELECT so.status_id, st.name as status_name 
         FROM public.sales_orders so
         JOIN public.status_types st ON so.status_id = st.id
         WHERE so.id = $1 AND so.user_id = $2`,
        [id, userId]
      );
      
      if (!orderInfo.length) {
        return null; // Order doesn't exist or doesn't belong to user
      }
      
      // Get all items from the sales order
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.sales_order_products WHERE sales_order_id = $1`,
        [id]
      );
      
      // Only update inventory if the order was confirmed
      if (orderInfo[0].status_name === 'confirmed') {
        // Update inventory for each product (add back to stock)
        for (const { product_id, quantity } of items) {
          const productResult = await client.query(
            `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
            [quantity, product_id, userId]
          );
          
          const currentStock = productResult.rows[0].quantity;
          const previousStock = currentStock - parseFloat(quantity);

          // Direct SQL insert for cancelled sales order
          await client.query(
            `INSERT INTO public.inventory_transactions(
              user_id, product_id, quantity, transaction_type_id, 
              previous_stock, new_stock
            ) VALUES($1, $2, $3, $4, $5, $6)`,
            [userId, product_id, quantity, 4, previousStock, currentStock]
          );
        }
      }
      
      // Delete the sales order (will cascade delete its products)
      const { rows } = await client.query(
        `DELETE FROM public.sales_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );
      
      return rows[0];
    });
  }

  // Validate customer and check if it belongs to user
  static async validateCustomer(customerId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.customers WHERE id = $1 AND user_id = $2`,
      [customerId, userId]
    );
    return rows[0];
  }

  // Validate sales order exists and belongs to user
  static async validateSalesOrder(salesOrderId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, userId]
    );
    return rows[0];
  }
}

module.exports = SalesOrder;
