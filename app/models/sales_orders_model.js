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
  static async update(id, { customerId, statusId, subtotal, totalAmount }, userId) {
    const { rows } = await pool.query(
      `UPDATE public.sales_orders
       SET customer_id = $1, status_id = $2, subtotal = $3, total_amount = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [customerId, statusId, subtotal, totalAmount, id, userId]
    );
    return rows[0];
  }

  // Delete a sales order and its products (leveraging CASCADE)
  static async delete(id, userId) {
    const { rows } = await pool.query(
      `DELETE FROM public.sales_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return rows[0];
  }

  // Add a product to an existing sales order
  static async addProduct(salesOrderId, { productId, quantity, unitPrice }, userId) {
    // First verify the sales order belongs to the user
    const orderCheck = await pool.query(
      `SELECT id FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      return null;
    }
    
    const { rows } = await pool.query(
      `INSERT INTO public.sales_order_products(sales_order_id, product_id, quantity, unit_price)
       VALUES($1, $2, $3, $4)
       ON CONFLICT (sales_order_id, product_id) 
       DO UPDATE SET quantity = sales_order_products.quantity + $3, 
                   unit_price = $4,
                   updated_at = NOW() 
       RETURNING *`,
      [salesOrderId, productId, quantity, unitPrice]
    );
    return rows[0];
  }

  // Remove a product from a sales order
  static async removeProduct(salesOrderId, productId, userId) {
    // Verify the sales order belongs to the user
    const orderCheck = await pool.query(
      `SELECT id FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      return null;
    }
    
    const { rows } = await pool.query(
      `DELETE FROM public.sales_order_products 
       WHERE sales_order_id = $1 AND product_id = $2 RETURNING *`,
      [salesOrderId, productId]
    );
    return rows[0];
  }

  // Update a sales order product
  static async updateProduct(salesOrderId, productId, { quantity, unitPrice }, userId) {
    // Verify the sales order belongs to the user
    const orderCheck = await pool.query(
      `SELECT id FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      return null;
    }
    
    const { rows } = await pool.query(
      `UPDATE public.sales_order_products
       SET quantity = $1, unit_price = $2, updated_at = NOW()
       WHERE sales_order_id = $3 AND product_id = $4 RETURNING *`,
      [quantity, unitPrice, salesOrderId, productId]
    );
    return rows[0];
  }

  // Process a product return
  static async returnProducts(salesOrderId, productId, { returnedQuantity, returnReason }, userId) {
    // Verify the sales order belongs to the user
    const orderCheck = await pool.query(
      `SELECT id FROM public.sales_orders WHERE id = $1 AND user_id = $2`,
      [salesOrderId, userId]
    );
    
    if (orderCheck.rows.length === 0) {
      return null;
    }
    
    const { rows } = await pool.query(
      `UPDATE public.sales_order_products
       SET returned_quantity = $1, return_reason = $2, return_date = NOW(), updated_at = NOW()
       WHERE sales_order_id = $3 AND product_id = $4
       RETURNING *`,
      [returnedQuantity, returnReason, salesOrderId, productId]
    );
    return rows[0];
  }
  
  // Get order status counts for a user
  static async getStatusCounts(userId) {
    const { rows } = await pool.query(
      `SELECT st.name as status, COUNT(so.id) as count
       FROM public.sales_orders so
       JOIN public.status_types st ON so.status_id = st.id
       WHERE so.user_id = $1
       GROUP BY st.name`,
      [userId]
    );
    return rows;
  }
}

module.exports = SalesOrder;
