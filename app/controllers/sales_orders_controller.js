const SalesOrder = require('../models/sales_orders_model');
const Customer = require('../models/customers_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Create a sales order with its products
async function createSalesOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const { customer_id, status_id, notes, items, order_date } = req.body;

    // Validate required fields
    if (!customer_id || !status_id || !items || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Cliente, estado y al menos un producto son requeridos');
    }
      // Validate customer belongs to user
      const customer = await Customer.findById(customer_id, userId);
      if (!customer) {
        return sendResponse(res, 404, 'error', 'Cliente no encontrado o no pertenece al usuario');
      }

      // Validate all products belong to user and have sufficient stock
      // Calculate total amount directly from items
      let totalAmount = 0;
      for (const product of items) {
        if (!product.product_id || !product.quantity || !product.unit_price) {
          return sendResponse(res, 400, 'error', 'Cada producto debe tener ID, cantidad y precio unitario');
        }
        
        const productExists = await Product.findById(product.product_id, userId);
        if (!productExists) {
          return sendResponse(res, 404, 'error', `Producto con ID ${product.product_id} no encontrado o no pertenece al usuario`);
        }
        
        // Check if product has sufficient stock
        const hasSufficientStock = await Product.hasSufficientStock(product.product_id, product.quantity, userId);
        if (!hasSufficientStock) {
          return sendResponse(res, 400, 'error', `Producto con ID ${product.product_id} no tiene suficiente stock disponible`);
        }

        // Add to total amount
        totalAmount += product.quantity * product.unit_price;
      }

      // Create the sales order with its products - model will handle inventory checks and updates
      const salesOrder = await SalesOrder.create({
        userId,
        customer_id,
        status_id,
        totalAmount,
        notes,
        items,
        order_date
      });

    return sendResponse(res, 201, 'success', 'Orden de venta creada exitosamente', salesOrder);
  } catch (error) {
    console.error('Error al crear orden de venta:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Get all sales orders for a user
async function listSalesOrders(req, res) {
  try {
    const userId = req.usuario.userId;
    const salesOrders = await SalesOrder.findAllByUser(userId);
    return sendResponse(res, 200, 'success', 'Órdenes de venta obtenidas', salesOrders);
  } catch (error) {
    console.error('Error al listar órdenes de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get a specific sales order with its products
async function getSalesOrder(req, res) {
  try {
    const orderId = req.params.id;
    const userId = req.usuario.userId;

    const salesOrder = await SalesOrder.findById(orderId, userId);
    if (!salesOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

    // Get the products for this sales order
    const products = await SalesOrder.getProducts(orderId, userId);
    
    // Combine order and products data
    const result = {
      ...salesOrder,
      products
    };

    return sendResponse(res, 200, 'success', 'Orden de venta encontrada', result);
  } catch (error) {
    console.error('Error al obtener orden de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Update a sales order
async function updateSalesOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const orderId = req.params.id;
    const { customer_id, status_id, order_date, notes, items } = req.body;

    // Validate required fields
    if (!customer_id || !status_id) {
      return sendResponse(res, 400, 'error', 'Cliente y estado son campos requeridos');
    }

    // Validate customer belongs to user
    const customer = await Customer.findById(customer_id, userId);
    if (!customer) {
      return sendResponse(res, 400, 'error', 'Cliente no encontrado o no pertenece al usuario');
    }

    // Validate the order exists
    const existingOrder = await SalesOrder.findById(orderId, userId);
    if (!existingOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

    // Get existing products for this order to calculate inventory changes
    const existingProducts = await SalesOrder.getProducts(orderId, userId);
    
    // Create a map of existing products for easier comparison
    const existingProductsMap = {};
    existingProducts.forEach(product => {
      existingProductsMap[product.product_id] = {
        quantity: product.quantity,
        product_id: product.product_id
      };
    });

    // Calculate totalAmount if items are provided
    let totalAmount = existingOrder.total_amount;
    
    if (items && Array.isArray(items) && items.length > 0) {
      // Validate all products belong to user
      for (const item of items) {
        if (!item.product_id || !item.quantity || !item.unit_price) {
          return sendResponse(res, 400, 'error', 'Cada producto debe tener ID, cantidad y precio unitario');
        }
        
        const productExists = await Product.findById(item.product_id, userId);
        if (!productExists) {
          return sendResponse(res, 404, 'error', `Producto con ID ${item.product_id} no encontrado o no pertenece al usuario`);
        }
        
        // Check inventory for increased quantities
        const existingQty = existingProductsMap[item.product_id] ? existingProductsMap[item.product_id].quantity : 0;
        const qtyDifference = item.quantity - existingQty;
        
        if (qtyDifference > 0) {
          // Need to check if we have enough inventory for the increased amount
          const hasSufficientStock = await Product.hasSufficientStock(item.product_id, qtyDifference, userId);
          if (!hasSufficientStock) {
            return sendResponse(res, 400, 'error', `Producto con ID ${item.product_id} no tiene suficiente stock disponible para el incremento solicitado`);
          }
        }
      }

      // Calculate new totalAmount directly from items
      totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    }

    // Format items for database
    const formattedItems = items ? items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    })) : [];

    // Update the sales order - the model will handle the transaction
    const updated = await SalesOrder.update(orderId, {
      customer_id,
      status_id,
      order_date,
      totalAmount,
      notes,
      items: formattedItems
    }, userId);
    
    if (!updated) {
      return sendResponse(res, 404, 'error', 'No se pudo actualizar la orden de venta');
    }

    return sendResponse(res, 200, 'success', 'Orden de venta actualizada', updated);
  } catch (error) {
    console.error('Error al actualizar orden de venta:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Delete a sales order
async function deleteSalesOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const orderId = req.params.id;

    const deleted = await SalesOrder.delete(orderId, userId);
    if (!deleted) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Orden de venta eliminada');
  } catch (error) {
    console.error('Error al eliminar orden de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = {
  createSalesOrder,
  listSalesOrders,
  getSalesOrder,
  updateSalesOrder,
  deleteSalesOrder
};
