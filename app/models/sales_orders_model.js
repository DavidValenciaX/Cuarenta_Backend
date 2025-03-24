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
  static async create({ user_id, customer_id, status_id, total_amount, sales_order_date, notes, items }) {
    // Execute within a transaction
    return this.executeWithTransaction(async (client) => {
      // Insert the sales order
      const salesOrderResult = await client.query(
        `INSERT INTO public.sales_orders(user_id, customer_id, status_id, total_amount, sales_order_date, notes)
         VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6)
         RETURNING *`,
        [user_id, customer_id, status_id, total_amount, sales_order_date, notes]
      );
      
      const salesOrder = salesOrderResult.rows[0];
      
      // Insert all the sales order products
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [salesOrder.id, item.product_id, item.quantity, item.unit_price]
          );
          
          // Update product inventory (decrease stock)
          const result = await client.query(
            `UPDATE public.products
             SET quantity = quantity - $1
             WHERE id = $2 AND user_id = $3
             RETURNING quantity`,
            [item.quantity, item.product_id, user_id]
          );
          
          if (!result.rows.length) {
            throw new Error(`No se pudo actualizar inventario para producto ${item.product_id}`);
          }
        }
      }
      
      return salesOrder;
    });
  }

  // Find all sales orders for a user
  static async findAllByUser(user_id) {
    const { rows } = await pool.query(
      `SELECT so.*, c.name as customer_name, st.name as status_name
       FROM public.sales_orders so
       JOIN public.customers c ON so.customer_id = c.id
       JOIN public.status_types st ON so.status_id = st.id
       WHERE so.user_id = $1 
       ORDER BY so.sales_order_date DESC`,
      [user_id]
    );
    return rows;
  }

  // Find a sales order by ID
  static async findById(id, user_id) {
    const { rows } = await pool.query(
      `SELECT so.*, c.name as customer_name, st.name as status_name
       FROM public.sales_orders so
       JOIN public.customers c ON so.customer_id = c.id
       JOIN public.status_types st ON so.status_id = st.id
       WHERE so.id = $1 AND so.user_id = $2`,
      [id, user_id]
    );
    return rows[0];
  }

  // Get products for a sales order
  static async getProducts(salesOrderId, user_id) {
    const { rows } = await pool.query(
      `SELECT sop.*, p.name as product_name, p.description as product_description
       FROM public.sales_order_products sop
       JOIN public.products p ON sop.product_id = p.id
       JOIN public.sales_orders so ON sop.sales_order_id = so.id
       WHERE sop.sales_order_id = $1 AND so.user_id = $2`,
      [salesOrderId, user_id]
    );
    return rows;
  }

  // Update a sales order
  static async update(id, { customer_id, status_id, sales_order_date, total_amount, notes, items }, user_id) {
    return this.executeWithTransaction(async (client) => {
      // Verify the sales order exists and belongs to user
      const existingSalesOrder = await this.findById(id, user_id);
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
          [item.quantity, item.product_id, user_id]
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
        SET customer_id = $1, status_id = $2, total_amount = $3, notes = $4, updated_at = NOW()
      `;
      
      const queryParams = [customer_id, status_id, total_amount, notes];
      let paramIndex = 5;
      
      // Add sales_order_date to the query if provided
      if (sales_order_date) {
        updateQuery += `, sales_order_date = $${paramIndex}`;
        queryParams.push(sales_order_date);
        paramIndex++;
      }
      
      updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      queryParams.push(id, user_id);
      
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
            [id, item.product_id, item.quantity, item.unit_price]
          );
          
          // Update product quantity (decrease stock)
          await client.query(
            `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
            [item.quantity, item.product_id, user_id]
          );
        }
      }
      
      return salesOrder;
    });
  }

  // Delete a sales order and its products (leveraging CASCADE)
  static async delete(id, user_id) {
    return this.executeWithTransaction(async (client) => {
      const { rows } = await client.query(
        `DELETE FROM public.sales_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, user_id]
      );
      return rows[0];
    });
  }

  // Validate customer and check if it belongs to user
  static async validateCustomer(customer_id, user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.customers WHERE id = $1 AND user_id = $2`,
      [customer_id, user_id]
    );
    return rows[0];
  }

  // Validate sales order exists and belongs to user
  static async validateSalesOrder(salesOrderId, user_id) {
    const { rows } = await pool.query(
      `SELECT * FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, user_id]
    );
    return rows[0];
  }
}

module.exports = SalesOrder;
