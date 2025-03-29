const pool = require('../config/data_base');
const InventoryTransaction = require('./inventory_transactions_model');

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
      
      // Get the status name to determine if inventory should be updated
      const statusResult = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      
      const statusName = statusResult.rows[0]?.name;
      const shouldUpdateInventory = statusName === 'confirmed';
      
      // Insert all the purchase order products
      if (items && items.length > 0) {
        for (const item of items) {
          // Insert the purchase order product
          await client.query(
            `INSERT INTO public.purchase_order_products(purchase_order_id, product_id, quantity, unit_cost)
              VALUES ($1, $2, $3, $4)`,
            [purchaseOrder.id, item.productId, item.quantity, item.unitCost]
          );

          // Update product quantity in inventory only if status is 'confirmed'
          if (shouldUpdateInventory) {
            const productResult = await client.query(
              `UPDATE public.products
               SET quantity = quantity + $1
               WHERE id = $2 AND user_id = $3
               RETURNING unit_cost, quantity`,
              [Number(item.quantity), item.productId, userId]
            );
            
            if (!productResult.rows.length) {
              throw new Error(`No se pudo actualizar inventario para producto ${item.productId}`);
            }
            
            // Direct SQL insert for confirmed purchase order
            const currentStock = Number(productResult.rows[0].quantity);
            const previousStock = currentStock - Number(item.quantity);
            
            await InventoryTransaction.recordTransaction({
              userId,
              productId: item.productId,
              quantity: Number(item.quantity),
              transactionTypeId: 1, // CONFIRMED_PURCHASE_ORDER
              previousStock,
              newStock: currentStock
            }, client);
            
            const currentUnitCost = Number(productResult.rows[0].unit_cost);
            
            if (Number(item.unitCost) > currentUnitCost) {
              // Update the unit cost for the product
              await client.query(
                `UPDATE public.products
                 SET unit_cost = $1
                 WHERE id = $2 AND user_id = $3`,
                [Number(item.unitCost), item.productId, userId]
              );
            }
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

      // Get the old status name
      const { rows: oldStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [existingPurchaseOrder.status_id]
      );
      const oldStatusName = oldStatusInfo[0]?.name;

      // Get the new status name
      const { rows: newStatusInfo } = await client.query(
        `SELECT name FROM public.status_types WHERE id = $1`,
        [statusId]
      );
      const newStatusName = newStatusInfo[0]?.name;

      // Prevent changing from confirmed to pending
      if (oldStatusName === 'confirmed' && newStatusName === 'pending') {
        throw new Error('No se puede cambiar una orden de compra de "confirmada" a "pendiente"');
      }

      // Get existing items without deleting them yet
      const { rows: oldItems } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_order_products WHERE purchase_order_id = $1`,
        [id]
      );
      
      // Create a mapping of old items by product_id for quick lookup
      const oldItemsMap = {};
      oldItems.forEach(item => {
        oldItemsMap[item.product_id] = Number(item.quantity);
      });
      
      // Create a mapping of new items by product_id
      const newItemsMap = {};
      if (items && items.length > 0) {
        items.forEach(item => {
          newItemsMap[item.productId] = Number(item.quantity);
        });
      }
      
      // Identify removed products (those in oldItems but not in newItems)
      if (oldStatusName === 'confirmed') {
        for (const oldItem of oldItems) {
          const productId = oldItem.product_id;
          // If product was in old order but not in new order, remove from inventory
          if (!newItemsMap[productId]) {
            const quantity = Number(oldItem.quantity);
            const productResult = await client.query(
              `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
              [quantity, productId, userId]
            );
            
            const currentStock = Number(productResult.rows[0].quantity);
            const previousStock = currentStock + quantity;
            
            // Record the inventory reduction
            await InventoryTransaction.recordTransaction({
              userId,
              productId,
              quantity: -quantity, // Negative as we're removing from inventory
              transactionTypeId: 2, // CANCELLED_PURCHASE_ORDER
              previousStock,
              newStock: currentStock
            }, client);
          }
        }
      }
      
      // Now we can delete old items
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
      
      // If items are provided, add new items
      if (items && items.length > 0) {
        for (const item of items) {
          // Insert the purchase order product
          await client.query(
            `INSERT INTO public.purchase_order_products(purchase_order_id, product_id, quantity, unit_cost)
              VALUES ($1, $2, $3, $4)`,
            [purchaseOrder.id, item.productId, item.quantity, item.unitCost]
          );
          
          const newQuantity = Number(item.quantity);
          const oldQuantity = oldItemsMap[item.productId] || 0;
          
          // Handle inventory updates based on status changes and product presence
          if (newStatusName === 'confirmed') {
            // Case 1: Product was not in old order but is in new order
            if (!oldItemsMap[item.productId]) {
              // Add full quantity to inventory (new product in confirmed order)
              const productResult = await client.query(
                `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
                [newQuantity, item.productId, userId]
              );
              
              const currentStock = Number(productResult.rows[0].quantity);
              const previousStock = currentStock - newQuantity;
              
              await InventoryTransaction.recordTransaction({
                userId,
                productId: item.productId,
                quantity: newQuantity,
                transactionTypeId: 1, // CONFIRMED_PURCHASE_ORDER
                previousStock,
                newStock: currentStock
              }, client);
            }
            // Case 2: Product was in old order and old order was confirmed
            else if (oldStatusName === 'confirmed') {
              // Only adjust the difference in quantities
              const quantityDifference = newQuantity - oldQuantity;
              
              if (quantityDifference !== 0) {
                const productResult = await client.query(
                  `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
                  [quantityDifference, item.productId, userId]
                );
                
                const currentStock = Number(productResult.rows[0].quantity);
                const previousStock = currentStock - quantityDifference;
                
                await InventoryTransaction.recordTransaction({
                  userId,
                  productId: item.productId,
                  quantity: quantityDifference,
                  transactionTypeId: 9, // ADJUSTMENT
                  previousStock,
                  newStock: currentStock
                }, client);
              }
            }
            // Case 3: Product was in old order but old order was pending, new order is confirmed
            else if (oldStatusName === 'pending') {
              // Add full quantity to inventory (status changed from pending to confirmed)
              const productResult = await client.query(
                `UPDATE public.products SET quantity = quantity + $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
                [newQuantity, item.productId, userId]
              );
              
              const currentStock = Number(productResult.rows[0].quantity);
              const previousStock = currentStock - newQuantity;
              
              await InventoryTransaction.recordTransaction({
                userId,
                productId: item.productId,
                quantity: newQuantity,
                transactionTypeId: 1, // CONFIRMED_PURCHASE_ORDER
                previousStock,
                newStock: currentStock
              }, client);
            }
            
            // Update unit cost if higher than current
            const { rows: productInfo } = await client.query(
              `SELECT unit_cost FROM public.products WHERE id = $1 AND user_id = $2`,
              [item.productId, userId]
            );
            
            if (productInfo.length > 0 && Number(item.unitCost) > Number(productInfo[0].unit_cost)) {
              await client.query(
                `UPDATE public.products SET unit_cost = $1 WHERE id = $2 AND user_id = $3`,
                [Number(item.unitCost), item.productId, userId]
              );
            }
          }
          // If both old and new status are 'pending', no inventory changes needed
        }
      }
      
      return purchaseOrder;
    });
  }

  // Delete a purchase order and update inventory
  static async delete(id, userId) {
    return this.executeWithTransaction(async (client) => {
      // Primero verificamos el estado de la orden de compra
      const { rows: orderInfo } = await client.query(
        `SELECT po.status_id, st.name as status_name 
         FROM public.purchase_orders po
         JOIN public.status_types st ON po.status_id = st.id
         WHERE po.id = $1 AND po.user_id = $2`,
        [id, userId]
      );
      
      if (!orderInfo.length) {
        return null; // La orden no existe o no pertenece al usuario
      }
      
      // Get all items from the purchase order
      const { rows: items } = await client.query(
        `SELECT product_id, quantity FROM public.purchase_order_products WHERE purchase_order_id = $1`,
        [id]
      );
      
      // Solo actualizamos el inventario si la orden estaba confirmada
      if (orderInfo[0].status_name === 'confirmed') {
        // Update inventory for each product (decrease stock)
        for (const { product_id, quantity } of items) {
          const productResult = await client.query(
            `UPDATE public.products SET quantity = quantity - $1 WHERE id = $2 AND user_id = $3 RETURNING quantity`,
            [Number(quantity), product_id, userId]
          );
          
          const currentStock = Number(productResult.rows[0].quantity);
          const previousStock = currentStock + Number(quantity);

          // Record cancelled purchase order using centralized method
          await InventoryTransaction.recordTransaction({
            userId,
            productId: product_id,
            quantity: -quantity, // Note the negative sign
            transactionTypeId: 2, // CANCELLED_PURCHASE_ORDER
            previousStock,
            newStock: currentStock
          }, client);
        }
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
