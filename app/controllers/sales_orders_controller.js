const SalesOrder = require('../models/sales_orders_model');
const Customer = require('../models/customers_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Helper function to convert values to numbers
function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// Create a sales order with its products
async function createSalesOrder(req, res) {
  try {
    const user_id = req.usuario.user_id;
    const { customer_id, status_id, sales_order_date, notes, items } = req.body;

    // Validate required fields
    if (!customer_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Cliente, estado y al menos un producto son requeridos');
    }
    
    // Validate customer
    const customer = await Customer.findById(customer_id, user_id);
    if (!customer) {
      return sendResponse(res, 404, 'error', 'Cliente no encontrado o no pertenece al usuario');
    }

    // Calculate total amount directly and validate products
    let total_amount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      const price = toNumber(item.unit_price);
      
      if (!qty || qty <= 0 || price === null || price <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad y precio unitario inválidos');
      }
      
      const product = await Product.findById(item.product_id, user_id);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto con ID ${item.product_id} no encontrado o no pertenece al usuario`);
      }
      
      // Check if product has sufficient stock
      const hasSufficientStock = await Product.hasSufficientStock(item.product_id, qty, user_id);
      if (!hasSufficientStock) {
        return sendResponse(res, 400, 'error', `Producto con ID ${item.product_id} no tiene suficiente stock disponible`);
      }
      
      total_amount += qty * price;
      validatedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: price
      });
    }

    // Create the sales order
    const salesOrder = await SalesOrder.create({
      user_id,
      customer_id,
      status_id,
      total_amount,
      sales_order_date,
      notes,
      items: validatedItems
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
    const user_id = req.usuario.user_id;
    const salesOrders = await SalesOrder.findAllByUser(user_id);
    return sendResponse(res, 200, 'success', 'Órdenes de venta obtenidas', salesOrders);
  } catch (error) {
    console.error('Error al listar órdenes de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get a specific sales order with its products
async function getSalesOrder(req, res) {
  try {
    const salesOrderId = req.params.id;
    const user_id = req.usuario.user_id;

    const salesOrder = await SalesOrder.findById(salesOrderId, user_id);
    if (!salesOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

    // Get the products for this sales order
    const products = await SalesOrder.getProducts(salesOrderId, user_id);
    
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
    const user_id = req.usuario.user_id;
    const salesOrderId = req.params.id;
    const { customer_id, status_id, sales_order_date, notes, items } = req.body;

    // Validate required fields
    if (!customer_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Cliente, estado y al menos un producto son requeridos');
    }

    // Validate customer belongs to user
    const customer = await Customer.findById(customer_id, user_id);
    if (!customer) {
      return sendResponse(res, 404, 'error', 'Cliente no encontrado o no pertenece al usuario');
    }

    // Validate the order exists
    const existingSalesOrder = await SalesOrder.findById(salesOrderId, user_id);
    if (!existingSalesOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada');
    }

    // Get existing products for this order to calculate inventory changes
    const existingProducts = await SalesOrder.getProducts(salesOrderId, user_id);
    
    // Create a map of existing products for easier comparison
    const existingProductsMap = {};
    existingProducts.forEach(product => {
      existingProductsMap[product.product_id] = {
        quantity: product.quantity,
        product_id: product.product_id
      };
    });

    // Calculate total_amount and validate products
    let total_amount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      const price = toNumber(item.unit_price);
      
      if (!qty || qty <= 0 || price === null || price <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad y precio unitario inválidos');
      }
      
      const product = await Product.findById(item.product_id, user_id);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto con ID ${item.product_id} no encontrado o no pertenece al usuario`);
      }
      
      // Check inventory for increased quantities
      const existingQty = existingProductsMap[item.product_id] ? existingProductsMap[item.product_id].quantity : 0;
      const qtyDifference = qty - existingQty;
      
      if (qtyDifference > 0) {
        // Need to check if we have enough inventory for the increased amount
        const hasSufficientStock = await Product.hasSufficientStock(item.product_id, qtyDifference, user_id);
        if (!hasSufficientStock) {
          return sendResponse(res, 400, 'error', `Producto con ID ${item.product_id} no tiene suficiente stock disponible para el incremento solicitado`);
        }
      }
      
      total_amount += qty * price;
      validatedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: price
      });
    }

    // Update the sales order
    const updated = await SalesOrder.update(salesOrderId, {
      customer_id,
      status_id,
      sales_order_date,
      total_amount,
      notes,
      items: validatedItems
    }, user_id);
    
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
    const user_id = req.usuario.user_id;
    const salesOrderId = req.params.id;

    const deleted = await SalesOrder.delete(salesOrderId, user_id);
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
