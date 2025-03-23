const PurchaseOrder = require('../models/purchase_orders_model');
const Supplier = require('../models/suppliers_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Helper function to convert values to numbers
function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// Create a purchase order with its products
async function createOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const { supplier_id, status_id, purchase_order_date, notes, items } = req.body;
  
    // Validate required fields
    if (!supplier_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'supplier_id, status_id e items son requeridos');
    }
  
    // Validate supplier
    const supplier = await Supplier.findById(supplier_id, userId);
    if (!supplier) {
      return sendResponse(res, 404, 'error', 'Proveedor inválido');
    }

    // Calculate subtotal and validate products
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      const price = toNumber(item.unit_price);
      
      if (!qty || qty <= 0 || price === null || price <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad y precio unitario inválidos');
      }
      
      const product = await Product.findById(item.product_id, userId);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto ${item.product_id} inválido`);
      }
      
      subtotal += qty * price;
      validatedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: price
      });
    }

    const total_amount = subtotal;

    // Create the purchase order
    const purchaseOrder = await PurchaseOrder.create({
      userId,
      supplier_id,
      status_id,
      subtotal,
      total_amount: total_amount,
      purchase_order_date,
      notes,
      items: validatedItems
    });
    
    return sendResponse(res, 201, 'success', 'Orden de compra creada exitosamente', purchaseOrder);
  } catch (error) {
    console.error('Error al crear orden de compra:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Get all purchase orders for a user
async function listOrders(req, res) {
  try {
    const userId = req.usuario.userId;
    const orders = await PurchaseOrder.findAllByUser(userId);
    return sendResponse(res, 200, 'success', 'Órdenes obtenidas', orders);
  } catch (error) {
    console.error('Error al listar órdenes de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get a specific purchase order with its products
async function getOrder(req, res) {
  try {
    const orderId = req.params.id;
    const userId = req.usuario.userId;
    
    const order = await PurchaseOrder.findById(orderId, userId);
    if (!order) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }
    
    // Get the products for this purchase order
    const products = await PurchaseOrder.getProducts(orderId, userId);
    
    // Combine order and products data
    const result = {
      ...order,
      products
    };
    
    return sendResponse(res, 200, 'success', 'Orden de compra encontrada', result);
  } catch (error) {
    console.error('Error al obtener orden de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Update a purchase order
async function updateOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const orderId = Number(req.params.id);
    const { supplier_id, status_id, purchase_order_date, notes, items } = req.body;

    // Validate required fields
    if (!supplier_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'supplier_id, status_id e items son requeridos');
    }

    // Validate supplier
    const supplier = await Supplier.findById(supplier_id, userId);
    if (!supplier) {
      return sendResponse(res, 404, 'error', 'Proveedor inválido');
    }

    // Calculate subtotal and validate products
    let subtotal = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      const price = toNumber(item.unit_price);
      
      if (!qty || qty <= 0 || price === null || price <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad y precio unitario inválidos');
      }
      
      const product = await Product.findById(item.product_id, userId);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto ${item.product_id} inválido`);
      }
      
      subtotal += qty * price;
      validatedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: price
      });
    }

    const total_amount = subtotal;

    // Update the purchase order
    const updatedOrder = await PurchaseOrder.update(orderId, {
      supplier_id,
      status_id,
      purchase_order_date,
      subtotal,
      total_amount: total_amount,
      notes,
      items: validatedItems
    }, userId);

    if (!updatedOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Orden de compra actualizada', updatedOrder);
  } catch (error) {
    console.error('Error al actualizar orden de compra:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Delete a purchase order
async function deleteOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const orderId = Number(req.params.id);

    const deletedOrder = await PurchaseOrder.delete(orderId, userId);
    
    if (!deletedOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Orden de compra eliminada exitosamente');
  } catch (error) {
    console.error('Error al eliminar orden de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = { createOrder, listOrders, getOrder, deleteOrder, updateOrder };