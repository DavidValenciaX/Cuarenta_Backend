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
  static async create({ userId, supplierId, statusId, totalAmount, purchaseOrderDate, notes, items }) {
    // Execute within a transaction
    return this.executeWithTransaction(async (client) => {
      // Insert the purchase order
      const purchaseOrderResult = await client.query(
        `INSERT INTO public.purchase_orders(user_id, supplier_id, status_id, total_amount, purchase_order_date, notes)
         VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6)
         RETURNING *`,
        [userId, supplierId, statusId, totalAmount, purchaseOrderDate, notes]
      );
      
      const purchaseOrder = purchaseOrderResult.rows[0];
      
      // Insert all the purchase order products
      if (items && items.length > 0) {
        for (const item of items) {
          await client.query(
            `INSERT INTO public.purchase_order_products(purchase_order_id, product_id, quantity, unit_price)
             VALUES ($1, $2, $3, $4)`,
            [purchaseOrder.id, item.productId, item.quantity, item.unitPrice]
          );
          
          // Update product quantity in inventory
          const result = await client.query(
            `UPDATE public.products
             SET quantity = quantity + $1
             WHERE id = $2 AND user_id = $3
             RETURNING unit_cost`,
            [item.quantity, item.productId, userId]
          );
          
          if (!result.rows.length) {
            throw new Error(`No se pudo actualizar inventario para producto ${item.productId}`);
          }
          
          const currentUnitCost = result.rows[0].unit_cost;
          
          if (item.unitPrice > currentUnitCost) {
            // Update the unit cost for the product
            await client.query(
              `UPDATE public.products
               SET unit_cost = $1
               WHERE id = $2 AND user_id = $3`,
              [item.unitPrice, item.productId, userId]
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
  static async update(id, { supplierId, statusId, purchaseOrderDate, totalAmount, notes, items }, userId) {
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
        SET supplier_id = $1, status_id = $2, total_amount = $3, notes = $4
      `;
      
      const queryParams = [supplierId, statusId, totalAmount, notes];
      let paramIndex = 5;
      
      // Add purchaseOrderDate to the query if provided
      if (purchaseOrderDate) {
        updateQuery += `, purchase_order_date = $${paramIndex}`;
        queryParams.push(purchaseOrderDate);
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
            [id, item.productId, item.quantity, item.unitPrice]
          );
          
          // Update product quantity (increase stock)
          await client.query(
            `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3`,
            [item.quantity, item.productId, userId]
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
