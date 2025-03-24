const pool = require('../config/data_base');

class PurchaseOrder {
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

  // Create a purchase order with its products
  static async create({ user_id, supplier_id, status_id, total_amount, purchase_order_date, notes, items }) {
    // Execute within a transaction
    return this.executeWithTransaction(async (client) => {
      // Insert the purchase order
      const purchaseOrderResult = await client.query(
        `INSERT INTO public.purchase_orders(user_id, supplier_id, status_id, total_amount, purchase_order_date, notes)
         VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6)
         RETURNING *`,
        [user_id, supplier_id, status_id, total_amount, purchase_order_date, notes]
      );
      
      const purchaseOrder = purchaseOrderResult.rows[0];
      
      // Insert all the purchase order products
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO public.purchase_order_products(purchase_order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [purchaseOrder.id, item.product_id, item.quantity, item.unit_price]
          );
          
          // Update product quantity in inventory
          const result = await client.query(
            `UPDATE public.products
             SET quantity = quantity + $1
             WHERE id = $2 AND user_id = $3
             RETURNING unit_price`,
            [item.quantity, item.product_id, user_id]
          );
          
          if (!result.rows.length) {
            throw new Error(`No se pudo actualizar inventario para producto ${item.product_id}`);
          }
          
          const currentUnitPrice = result.rows[0].unit_price;
          
          // Check if this purchase order is the most recent one for this product
          const { rows: [latest] } = await client.query(
            `SELECT po.id
             FROM public.purchase_orders po
             JOIN public.purchase_order_products pop ON pop.purchase_order_id = po.id
             WHERE pop.product_id = $1 AND po.user_id = $2
             ORDER BY po.purchase_order_date DESC
             LIMIT 1`,
            [item.product_id, user_id]
          );
          
          if (latest?.id === purchaseOrder.id && item.unit_price > currentUnitPrice) {
            await client.query(
              `UPDATE public.products
               SET unit_price = $1
               WHERE id = $2 AND user_id = $3`,
              [item.unit_price, item.product_id, user_id]
            );
          }
        }
      }
      
      return purchaseOrder;
    });
  }

  // Find all purchase orders for a user
  static async findAllByUser(userId) {
    const { rows } = await pool.query(
      `SELECT po.*, s.name as supplier_name, st.name as status_name
       FROM public.purchase_orders po
       JOIN public.suppliers s ON po.supplier_id = s.id
       JOIN public.status_types st ON po.status_id = st.id
       WHERE po.user_id = $1
       ORDER BY po.purchase_order_date DESC`,
      [userId]
    );
    return rows;
  }

  // Find a purchase order by ID
  static async findById(id, userId) {
    const { rows } = await pool.query(
      `SELECT po.*, s.name as supplier_name, st.name as status_name
       FROM public.purchase_orders po
       JOIN public.suppliers s ON po.supplier_id = s.id
       JOIN public.status_types st ON po.status_id = st.id
       WHERE po.id = $1 AND po.user_id = $2`,
      [id, userId]
    );
    return rows[0];
  }

  // Get products for a purchase order
  static async getProducts(purchaseOrderId, userId) {
    const { rows } = await pool.query(
      `SELECT pop.*, p.name as product_name, p.description as product_description
       FROM public.purchase_order_products pop
       JOIN public.products p ON pop.product_id = p.id
       JOIN public.purchase_orders po ON pop.purchase_order_id = po.id
       WHERE pop.purchase_order_id = $1 AND po.user_id = $2`,
      [purchaseOrderId, userId]
    );
    return rows;
  }

  // Update a purchase order
  static async update(id, { supplier_id, status_id, purchase_order_date, total_amount, notes, items }, userId) {
    return this.executeWithTransaction(async (client) => {
      // Verify the purchase order exists and belongs to user
      const existingPurchaseOrder = await this.findById(id, userId);
      if (!existingPurchaseOrder) {
        return null;
      }

      // Get existing items
      const { rows: oldItems } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_order_products WHERE purchase_order_id = $1`,
        [id]
      );
      
      // Revert inventory for old items (decrease from inventory)
      for (const item of oldItems) {
        await client.query(
          `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
          [item.quantity, item.product_id, userId]
        );
      }
      
      // Delete old items
      await client.query(
        `DELETE FROM public.purchase_order_products WHERE purchase_order_id = $1`,
        [id]
      );
      
      // Build the update query
      let updateQuery = `
        UPDATE public.purchase_orders
        SET supplier_id = $1, status_id = $2, total_amount = $3, notes = $4, updated_at = NOW()
      `;
      
      const queryParams = [supplier_id, status_id, total_amount, notes];
      let paramIndex = 5;
      
      // Add purchase_order_date to the query if provided
      if (purchase_order_date) {
        updateQuery += `, purchase_order_date = $${paramIndex}`;
        queryParams.push(purchase_order_date);
        paramIndex++;
      }
      
      updateQuery += ` WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;
      queryParams.push(id, userId);
      
      const purchaseOrderResult = await client.query(updateQuery, queryParams);
      
      if (purchaseOrderResult.rows.length === 0) {
        return null;
      }
      
      const purchaseOrder = purchaseOrderResult.rows[0];
      
      // If items are provided, add new items and update inventory
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO public.purchase_order_products(purchase_order_id, product_id, quantity, unit_price)
             VALUES($1, $2, $3, $4)`,
            [id, item.product_id, item.quantity, item.unit_price]
          );
          
          // Update product quantity (increase stock)
          await client.query(
            `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
            [item.quantity, item.product_id, userId]
          );
        }
      }
      
      return purchaseOrder;
    });
  }

  // Delete a purchase order and update inventory
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // Get all items from the purchase order
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_order_products WHERE purchase_order_id = $1`,
        [id]
      );
      
      // Update inventory for each product
      for (const { product_id, quantity } of items) {
        await client.query(
          `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3`,
          [quantity, product_id, userId]
        );
      }
      
      // Delete the purchase order (will cascade delete its products)
      const { rows } = await client.query(
        `DELETE FROM public.purchase_orders WHERE id = $1 AND user_id = $2 RETURNING *`,
        [id, userId]
      );
      
      return rows[0];
    });
  }

  // Validate supplier and check if it belongs to user
  static async validateSupplier(supplierId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.suppliers WHERE id = $1 AND user_id = $2`,
      [supplierId, userId]
    );
    return rows[0];
  }

  // Validate purchase order exists and belongs to user
  static async validatePurchaseOrder(orderId, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM public.purchase_orders WHERE id = $1 AND user_id = $2`,
      [orderId, userId]
    );
    return rows[0];
  }
}

module.exports = PurchaseOrder;
