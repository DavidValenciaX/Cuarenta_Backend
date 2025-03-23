const pool = require('../config/data_base');
const PurchaseOrder = require('../models/purchase_orders_model');
const Supplier = require('../models/suppliers_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? null : n;
}

async function createOrder(req, res) {
    const userId = req.usuario.userId;
    const { supplier_id, status_id, purchase_order_date, notes, items } = req.body;
  
    if (!supplier_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'supplier_id, status_id e items son requeridos');
    }
  
  // Validate supplier
  const supplier = await Supplier.findById(supplier_id, userId);
  if (!supplier) return sendResponse(res, 404, 'error', 'Proveedor inválido');

  // Validate each product
  let subtotal = 0;
  for (const item of items) {
    const qty = toNumber(item.quantity);
    const price = toNumber(item.unit_price);
    if (!qty || qty <= 0 || price === null || price <=0) {
      return sendResponse(res, 400, 'error', 'Cantidad y precio unitario inválidos');
    }
    const product = await Product.findById(item.product_id, userId);
    if (!product) return sendResponse(res, 404, 'error', `Producto ${item.product_id} inválido`);
    subtotal += qty * price;
  }

  const total_amount = subtotal;

  try {
    const order = await PurchaseOrder.createOrderWithTransaction({
      userId,
      supplier_id,
      status_id,
      subtotal,
      total_amount,
      purchase_order_date: purchase_order_date || new Date(),
      notes,
      items
    });
    
    return sendResponse(res, 201, 'success', 'Orden creada', order);
  } catch (error) {
    return sendResponse(res, 500, 'error', error.message);
  }
}

async function listOrders(req, res) {
  const orders = await PurchaseOrder.findAllByUser(req.usuario.userId);
  return sendResponse(res, 200, 'success', 'Órdenes obtenidas', orders);
}

async function getOrder(req, res) {
  const order = await PurchaseOrder.findById(req.params.id, req.usuario.userId);
  if (!order) return sendResponse(res, 404, 'error', 'Orden no encontrada');
  return sendResponse(res, 200, 'success', 'Orden encontrada', order);
}

async function updateOrder(req, res) {
  const userId = req.usuario.userId;
  const orderId = Number(req.params.id);
  const { supplier_id, status_id, purchase_order_date, notes, items } = req.body;

  if (!supplier_id || status_id == null || !Array.isArray(items) || items.length === 0) {
    return sendResponse(res, 400, 'error', 'supplier_id, status_id e items son requeridos');
  }

  try {
    // Validar proveedor
    const supplier = await Supplier.findById(supplier_id, userId);
    if (!supplier) throw new Error('Proveedor inválido');

    // Validar productos
    for (const { product_id, quantity, unit_price } of items) {
      const qty = Number(quantity);
      const price = Number(unit_price);
      if (!qty || qty <= 0 || isNaN(price) || price <= 0) {
        throw new Error('Cantidad y precio unitario inválidos');
      }

      const product = await Product.findById(product_id, userId);
      if (!product) throw new Error(`Producto ${product_id} inválido`);
    }

    const updatedOrder = await PurchaseOrder.updateOrderWithTransaction(orderId, userId, {
      supplier_id, 
      status_id, 
      purchase_order_date, 
      notes, 
      items
    });

    if (!updatedOrder) {
      return sendResponse(res, 404, 'error', 'Orden no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Orden actualizada', updatedOrder);
  } catch (error) {
    return sendResponse(res, 400, 'error', error.message);
  }
}

async function deleteOrder(req, res) {
  const userId = req.usuario.userId;
  const orderId = Number(req.params.id);

  try {
    const deletedOrder = await PurchaseOrder.deleteOrderWithTransaction(orderId, userId);
    
    if (!deletedOrder) {
      return sendResponse(res, 404, 'error', 'Orden no encontrada o sin items');
    }

    return sendResponse(res, 200, 'success', 'Orden eliminada exitosamente');
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, 'error', 'Error al eliminar orden');
  }
}

module.exports = { createOrder, listOrders, getOrder, deleteOrder, updateOrder };