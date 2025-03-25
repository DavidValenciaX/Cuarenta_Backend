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
      
      // Insert all the sales order products
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [salesOrder.id, item.productId, item.quantity, item.unitPrice]
          );
          
          // Update product inventory (decrease stock)
          const result = await client.query(
            `UPDATE public.products
             SET quantity = quantity - $1
             WHERE id = $2 AND user_id = $3
             RETURNING quantity`,
            [item.quantity, item.productId, userId]
          );
          
          if (!result.rows.length) {
            throw new Error(`No se pudo actualizar inventario para producto ${item.productId}`);
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

      // Get existing items
      const { rows: oldItems } = await client.query(
        `SELECT product_id, quantity FROM public.sales_order_products WHERE sales_order_id = $1`,
        [id]
      );
      
      // Revert inventory for old items (add back to inventory)
      for (const item of oldItems) {
        await client.query(
          `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
          [item.quantity, item.product_id, userId]
        );
      }
      
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
          await client.query(
            `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
             VALUES($1, $2, $3, $4)`,
            [id, item.productId, item.quantity, item.unitPrice]
          );
          
          // Update product quantity (decrease stock)
          await client.query(
            `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
            [item.quantity, item.productId, userId]
          );
        }
      }
      
      return salesOrder;
    });
  }

  // Delete a sales order and its products (leveraging CASCADE)
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
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
