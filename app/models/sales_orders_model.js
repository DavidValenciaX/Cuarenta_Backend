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
  static async create({ userId, customer_id, status_id, totalAmount, notes, items, order_date, client }) {
    // If client is provided, use it (part of an existing transaction)
    // Otherwise create a new transaction
    if (client) {
      // Insert the sales order
      const orderResult = await client.query(
        `INSERT INTO public.sales_orders(user_id, customer_id, status_id, total_amount, notes, order_date)
         VALUES($1, $2, $3, $4, $5, COALESCE($6, NOW())) RETURNING *`,
        [userId, customer_id, status_id, totalAmount, notes, order_date]
      );
      
      const salesOrder = orderResult.rows[0];
      
      // Insert all the sales order products
      if (items && items.length > 0) {
        for (const product of items) {
          await client.query(
            `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
             VALUES($1, $2, $3, $4)`,
            [salesOrder.id, product.product_id, product.quantity, product.unit_price]
          );
        }
      }
      
      return salesOrder;
    } else {
      // Execute within a new transaction
      return this.executeWithTransaction(async (client) => {
        const orderData = { userId, customer_id, status_id, totalAmount, notes, items, order_date, client };
        return await this.create(orderData);
      });
    }
  }

  // Find all sales orders for a user
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT so.*, c.name as customer_name, st.name as status_name
       FROM public.sales_orders so
       JOIN public.customers c ON so.customer_id = c.id
       JOIN public.status_types st ON so.status_id = st.id
       WHERE so.user_id = $1 
       ORDER BY so.order_date DESC`,
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
  static async update(id, { customer_id, status_id, order_date, totalAmount, notes, items }, userId, client = null) {
    if (client) {
      // Build the update query based on whether order_date is provided
      let updateQuery = `
        UPDATE public.sales_orders
        SET customer_id = $1, status_id = $2, total_amount = $3, notes = $4, updated_at = NOW()
      `;
      
      const queryParams = [customer_id, status_id, totalAmount, notes];
      let paramIndex = 5;
      
      // Add order_date to the query if provided
      if (order_date) {
        updateQuery += `, order_date = $${paramIndex}`;
        queryParams.push(order_date);
        paramIndex++;
      }
      
      updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      queryParams.push(id, userId);
      
      const orderResult = await client.query(updateQuery, queryParams);
      
      if (orderResult.rows.length === 0) {
        return null;
      }
      
      const salesOrder = orderResult.rows[0];
      
      // If items are provided, update the order products
      if (items && items.length > 0) {
        // Remove all existing products for this order
        await client.query(
          `DELETE FROM public.sales_order_products WHERE sales_order_id = $1`,
          [id]
        );
        
        // Insert all new products
        for (const item of items) {
          await client.query(
            `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
             VALUES($1, $2, $3, $4)`,
            [id, item.product_id, item.quantity, item.unit_price]
          );
        }
      }
      
      return salesOrder;
    } else {
      // Execute within a new transaction
      return this.executeWithTransaction(async (client) => {
        return await this.update(id, { customer_id, status_id, order_date, totalAmount, notes, items }, userId, client);
      });
    }
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
  static async validateCustomer(customer_id, userId, client) {
    const { rows } = await client.query(
      `SELECT * FROM public.customers WHERE id = $1 AND user_id = $2`,
      [customer_id, userId]
    );
    return rows[0];
  }

  // Validate sales order exists and belongs to user
  static async validateSalesOrder(orderId, userId, client) {
    const { rows } = await client.query(
      `SELECT * FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );
    return rows[0];
  }
}

module.exports = SalesOrder;
