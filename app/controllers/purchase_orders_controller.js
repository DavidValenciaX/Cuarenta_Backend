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
async function createPurchaseOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const { supplier_id, status_id, purchase_order_date, notes, items } = req.body;
  
    // Validate required fields
    if (!supplier_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Proveedor, estado y al menos un producto son requeridos');
    }
  
    // Validate supplier
    const supplier = await Supplier.findById(supplier_id, userId);
    if (!supplier) {
      return sendResponse(res, 404, 'error', 'Proveedor no encontrado o no pertenece al usuario');
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
      
      const product = await Product.findById(item.product_id, userId);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto con ID ${item.product_id} no encontrado o no pertenece al usuario`);
      }
      
      total_amount += qty * price;
      validatedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: price
      });
    }

    // Create the purchase order
    const purchaseOrder = await PurchaseOrder.create({
      userId,
      supplier_id,
      status_id,
      total_amount,
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
async function listPurchaseOrders(req, res) {
  try {
    const userId = req.usuario.userId;
    const purchaseOrders = await PurchaseOrder.findAllByUser(userId);
    return sendResponse(res, 200, 'success', 'Órdenes de compra obtenidas', purchaseOrders);
  } catch (error) {
    console.error('Error al listar órdenes de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get a specific purchase order with its products
async function getPurchaseOrder(req, res) {
  try {
    const purchaseOrderId = req.params.id;
    const userId = req.usuario.userId;
    
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId, userId);
    if (!purchaseOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }
    
    // Get the products for this purchase order
    const products = await PurchaseOrder.getProducts(purchaseOrderId, userId);
    
    // Combine order and products data
    const result = {
      ...purchaseOrder,
      products
    };
    
    return sendResponse(res, 200, 'success', 'Orden de compra encontrada', result);
  } catch (error) {
    console.error('Error al obtener orden de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Update a purchase order
async function updatePurchaseOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const purchaseOrderId = Number(req.params.id);
    const { supplier_id, status_id, purchase_order_date, notes, items } = req.body;

    // Validate required fields
    if (!supplier_id || status_id == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Proveedor, estado y al menos un producto son requeridos');
    }

    // Validate supplier belongs to user
    const supplier = await Supplier.findById(supplier_id, userId);
    if (!supplier) {
      return sendResponse(res, 404, 'error', 'Proveedor no encontrado o no pertenece al usuario');
    }

    // Validate the order exists
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId, userId);
    if (!purchaseOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }

    // Calculate total_amount and validate products
    let total_amount = 0;
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      const price = toNumber(item.unit_price);
      
      if (!qty || qty <= 0 || price === null || price <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad y precio unitario inválidos');
      }
      
      const product = await Product.findById(item.product_id, userId);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto con ID ${item.product_id} no encontrado o no pertenece al usuario`);
      }
      
      total_amount += qty * price;
      validatedItems.push({
        product_id: item.product_id,
        quantity: qty,
        unit_price: price
      });
    }

    // Update the purchase order
    const updatedPurchaseOrder = await PurchaseOrder.update(purchaseOrderId, {
      supplier_id,
      status_id,
      purchase_order_date,
      total_amount,
      notes,
      items: validatedItems
    }, userId);

    if (!updatedPurchaseOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Orden de compra actualizada', updatedPurchaseOrder);
  } catch (error) {
    console.error('Error al actualizar orden de compra:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Delete a purchase order
async function deletePurchaseOrder(req, res) {
  try {
    const userId = req.usuario.userId;
    const purchaseOrderId = Number(req.params.id);

    const deletedPurchaseOrder = await PurchaseOrder.delete(purchaseOrderId, userId);
    
    if (!deletedPurchaseOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Orden de compra eliminada exitosamente');
  } catch (error) {
    console.error('Error al eliminar orden de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = { 
  createPurchaseOrder, 
  listPurchaseOrders, 
  getPurchaseOrder, 
  deletePurchaseOrder, 
  updatePurchaseOrder 
};