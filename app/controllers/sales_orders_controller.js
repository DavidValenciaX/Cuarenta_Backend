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
    const { customerId, statusId, subtotal, totalAmount } = req.body;
    const userId = req.usuario.userId;

    // Validate required fields
    if (!customerId || !statusId || subtotal === undefined || totalAmount === undefined) {
      return sendResponse(res, 400, 'error', 'Todos los campos son requeridos');
    }

    // Validate customer belongs to user
    const customer = await Customer.findById(customerId, userId);
    if (!customer) {
      return sendResponse(res, 404, 'error', 'Cliente no encontrado o no pertenece al usuario');
    }

    // Update the sales order
    const updated = await SalesOrder.update(orderId, {
      customerId,
      statusId,
      subtotal,
      totalAmount
    }, userId);

    if (!updated) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

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

// Add a product to a sales order
async function addProductToOrder(req, res) {
  try {
    const orderId = req.params.id;
    const { productId, quantity, unitPrice } = req.body;
    const userId = req.usuario.userId;

    // Validate required fields
    if (!productId || !quantity || !unitPrice) {
      return sendResponse(res, 400, 'error', 'productId, quantity y unitPrice son requeridos');
    }

    // Validate product belongs to user
    const product = await Product.findById(productId, userId);
    if (!product) {
      return sendResponse(res, 404, 'error', 'Producto no encontrado o no pertenece al usuario');
    }

    // Add product to order
    const added = await SalesOrder.addProduct(orderId, {
      productId,
      quantity,
      unitPrice
    }, userId);

    if (!added) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada o no pertenece al usuario');
    }

    return sendResponse(res, 200, 'success', 'Producto añadido a la orden', added);
  } catch (error) {
    console.error('Error al añadir producto a la orden:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Update a product in a sales order
async function updateOrderProduct(req, res) {
  try {
    const orderId = req.params.id;
    const productId = req.params.productId;
    const { quantity, unitPrice } = req.body;
    const userId = req.usuario.userId;

    // Validate required fields
    if (!quantity || !unitPrice) {
      return sendResponse(res, 400, 'error', 'quantity y unitPrice son requeridos');
    }

    // Update product in order
    const updated = await SalesOrder.updateProduct(orderId, productId, {
      quantity,
      unitPrice
    }, userId);

    if (!updated) {
      return sendResponse(res, 404, 'error', 'Orden de venta o producto no encontrado');
    }

    return sendResponse(res, 200, 'success', 'Producto de la orden actualizado', updated);
  } catch (error) {
    console.error('Error al actualizar producto de la orden:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Remove a product from a sales order
async function removeProductFromOrder(req, res) {
  try {
    const orderId = req.params.id;
    const productId = req.params.productId;
    const userId = req.usuario.userId;

    // Remove product from order
    const removed = await SalesOrder.removeProduct(orderId, productId, userId);

    if (!removed) {
      return sendResponse(res, 404, 'error', 'Orden de venta o producto no encontrado');
    }

    return sendResponse(res, 200, 'success', 'Producto eliminado de la orden');
  } catch (error) {
    console.error('Error al eliminar producto de la orden:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Process product returns
async function processProductReturn(req, res) {
  try {
    const orderId = req.params.id;
    const productId = req.params.productId;
    const { returnedQuantity, returnReason } = req.body;
    const userId = req.usuario.userId;

    // Validate required fields
    if (!returnedQuantity || !returnReason) {
      return sendResponse(res, 400, 'error', 'returnedQuantity y returnReason son requeridos');
    }

    // Process the return
    const returned = await SalesOrder.returnProducts(orderId, productId, {
      returnedQuantity,
      returnReason
    }, userId);

    if (!returned) {
      return sendResponse(res, 404, 'error', 'Orden de venta o producto no encontrado');
    }

    return sendResponse(res, 200, 'success', 'Devolución de producto procesada', returned);
  } catch (error) {
    console.error('Error al procesar devolución de producto:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get order status statistics
async function getOrderStats(req, res) {
  try {
    const userId = req.usuario.userId;
    const stats = await SalesOrder.getStatusCounts(userId);
    return sendResponse(res, 200, 'success', 'Estadísticas de órdenes obtenidas', stats);
  } catch (error) {
    console.error('Error al obtener estadísticas de órdenes:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = {
  createSalesOrder,
  listSalesOrders,
  getSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  addProductToOrder,
  updateOrderProduct,
  removeProductFromOrder,
  processProductReturn,
  getOrderStats
};
