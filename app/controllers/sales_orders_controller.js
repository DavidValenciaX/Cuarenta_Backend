const SalesOrder = require('../models/sales_orders_model');
const Customer = require('../models/customers_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Create a sales order with its products
async function createSalesOrder(req, res) {
  try {
    const { customerId, statusId, subtotal, totalAmount, products } = req.body;
    const userId = req.usuario.userId;

    // Validate required fields
    if (!customerId || !statusId || subtotal === undefined || totalAmount === undefined || !products || !Array.isArray(products) || products.length === 0) {
      return sendResponse(res, 400, 'error', 'Todos los campos son requeridos y debe incluir al menos un producto');
    }

    // Validate customer belongs to user
    const customer = await Customer.findById(customerId, userId);
    if (!customer) {
      return sendResponse(res, 404, 'error', 'Cliente no encontrado o no pertenece al usuario');
    }

    // Validate all products belong to user
    for (const product of products) {
      if (!product.productId || !product.quantity || !product.unitPrice) {
        return sendResponse(res, 400, 'error', 'Cada producto debe tener ID, cantidad y precio unitario');
      }
      
      const productExists = await Product.findById(product.productId, userId);
      if (!productExists) {
        return sendResponse(res, 404, 'error', `Producto con ID ${product.productId} no encontrado o no pertenece al usuario`);
      }
    }

    // Create the sales order with its products
    const salesOrder = await SalesOrder.create({
      userId,
      customerId,
      statusId,
      subtotal,
      totalAmount,
      products
    });

    return sendResponse(res, 201, 'success', 'Orden de venta creada exitosamente', salesOrder);
  } catch (error) {
    console.error('Error al crear orden de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
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
    const orderId = req.params.id;
    const { customerId, statusId, order_date, items } = req.body;
    const userId = req.usuario.userId;

    // Validate required fields
    if (!customerId || !statusId) {
      return sendResponse(res, 400, 'error', 'Cliente y estado son campos requeridos');
    }

    // Validate customer belongs to user
    const customer = await Customer.findById(customerId, userId);
    if (!customer) {
      return sendResponse(res, 404, 'error', 'Cliente no encontrado o no pertenece al usuario');
    }

    // Validate the order exists
    const existingOrder = await SalesOrder.findById(orderId, userId);
    if (!existingOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

    // Calculate subtotal and totalAmount if items are provided
    let subtotal = existingOrder.subtotal;
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
      }

      // Calculate new subtotal from items
      subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Apply simple tax calculation (19% VAT) - this should be configured or calculated properly
      totalAmount = subtotal * 1.19;
    }

    // Format items for database
    const formattedItems = items ? items.map(item => ({
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: item.unit_price
    })) : [];

    // Update the sales order
    const updated = await SalesOrder.update(orderId, {
      customerId,
      statusId,
      order_date,
      subtotal,
      totalAmount,
      items: formattedItems
    }, userId);

    return sendResponse(res, 200, 'success', 'Orden de venta actualizada', updated);
  } catch (error) {
    console.error('Error al actualizar orden de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Delete a sales order
async function deleteSalesOrder(req, res) {
  try {
    const orderId = req.params.id;
    const userId = req.usuario.userId;

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
