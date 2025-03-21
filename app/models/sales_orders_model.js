const pool = require('../config/data_base');

class SalesOrder {
  // Create a sales order with its products
  static async create({ userId, customerId, statusId, subtotal, totalAmount, products }) {
    // Start a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Insert the sales order
      const orderResult = await client.query(
        `INSERT INTO public.sales_orders(user_id, customer_id, status_id, subtotal, total_amount)
         VALUES($1, $2, $3, $4, $5) RETURNING *`,
        [userId, customerId, statusId, subtotal, totalAmount]
      );
      
      const salesOrder = orderResult.rows[0];
      
      // Insert all the sales order products
      if (products && products.length > 0) {
        for (const product of products) {
          await client.query(
            `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
             VALUES($1, $2, $3, $4)`,
            [salesOrder.id, product.productId, product.quantity, product.unitPrice]
          );
        }
      }
      
      await client.query('COMMIT');
      return salesOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
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
  static async update(id, { customerId, statusId, order_date, subtotal, totalAmount, items }, userId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Build the update query based on whether order_date is provided
      let updateQuery = `
        UPDATE public.sales_orders
        SET customer_id = $1, status_id = $2, subtotal = $3, total_amount = $4, updated_at = NOW()
      `;
      
      const queryParams = [customerId, statusId, subtotal, totalAmount];
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
        await client.query('ROLLBACK');
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
            [id, item.productId, item.quantity, item.unitPrice]
          );
        }
      }
      
      await client.query('COMMIT');
      return salesOrder;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete a sales order and its products (leveraging CASCADE)
  static async delete(id, userId) {
    const { rows } = await pool.query(
      `DELETE FROM public.sales_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return rows[0];
  }

}

module.exports = SalesOrder;
