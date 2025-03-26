const PurchaseReturn = require('../models/purchase_returns_model');
const PurchaseOrder = require('../models/purchase_orders_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Helper function to convert values to numbers
function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// Create a purchase return with its items
async function createPurchaseReturn(req, res) {
  try {
    const userId = req.usuario.userId;
    const { purchaseOrderId, statusId, returnDate, notes, items } = req.body;

    // Validate required fields
    if (!purchaseOrderId || statusId == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Orden de compra, estado y al menos un producto son requeridos');
    }
    
    // Validate purchase order
    const purchaseOrder = await PurchaseOrder.validatePurchaseOrder(purchaseOrderId, userId);
    if (!purchaseOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada o no pertenece al usuario');
    }

    // Validate products
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      
      if (!qty || qty <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad inválida');
      }
      
      const product = await Product.findById(item.productId, userId);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto con ID ${item.productId} no encontrado o no pertenece al usuario`);
      }
      
      // Check if there's enough inventory to return
      if (product.quantity < qty && (statusId === 1 || statusId === 2)) { // Assuming 1, 2 are confirmed/completed statuses
        return sendResponse(res, 400, 'error', `Inventario insuficiente para el producto ${product.name}`);
      }
      
      validatedItems.push({
        productId: item.productId,
        quantity: qty,
        statusId: item.statusId || statusId
      });
    }

    // Create the purchase return
    const purchaseReturn = await PurchaseReturn.create({
      userId,
      purchaseOrderId,
      statusId,
      notes,
      returnDate,
      items: validatedItems
    });
    
    return sendResponse(res, 201, 'success', 'Devolución de compra creada exitosamente', purchaseReturn);
  } catch (error) {
    console.error('Error al crear devolución de compra:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Get all purchase returns for a user
async function listPurchaseReturns(req, res) {
  try {
    const userId = req.usuario.userId;
    const purchaseReturns = await PurchaseReturn.findAllByUser(userId);
    return sendResponse(res, 200, 'success', 'Devoluciones de compra obtenidas', purchaseReturns);
  } catch (error) {
    console.error('Error al listar devoluciones de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get a specific purchase return with its items
async function getPurchaseReturn(req, res) {
  try {
    const purchaseReturnId = req.params.id;
    const userId = req.usuario.userId;

    const purchaseReturn = await PurchaseReturn.findById(purchaseReturnId, userId);
    if (!purchaseReturn) {
      return sendResponse(res, 404, 'error', 'Devolución de compra no encontrada');
    }

    // Get the items for this purchase return
    const items = await PurchaseReturn.getItems(purchaseReturnId, userId);
    
    // Combine return and items data
    const result = {
      ...purchaseReturn,
      items
    };

    return sendResponse(res, 200, 'success', 'Devolución de compra encontrada', result);
  } catch (error) {
    console.error('Error al obtener devolución de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Update a purchase return
async function updatePurchaseReturn(req, res) {
  try {
    const userId = req.usuario.userId;
    const purchaseReturnId = req.params.id;
    const { purchaseOrderId, statusId, returnDate, notes, items } = req.body;

    // Validate required fields
    if (!purchaseOrderId || statusId == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Orden de compra, estado y al menos un producto son requeridos');
    }

    // Validate purchase order belongs to user
    const purchaseOrder = await PurchaseOrder.validatePurchaseOrder(purchaseOrderId, userId);
    if (!purchaseOrder) {
      return sendResponse(res, 404, 'error', 'Orden de compra no encontrada o no pertenece al usuario');
    }

    // Validate the return exists
    const existingPurchaseReturn = await PurchaseReturn.findById(purchaseReturnId, userId);
    if (!existingPurchaseReturn) {
      return sendResponse(res, 404, 'error', 'Devolución de compra no encontrada');
    }

    // Validate products
    const validatedItems = [];
    
    for (const item of items) {
      const qty = toNumber(item.quantity);
      
      if (!qty || qty <= 0) {
        return sendResponse(res, 400, 'error', 'Cantidad inválida');
      }
      
      const product = await Product.findById(item.productId, userId);
      if (!product) {
        return sendResponse(res, 404, 'error', `Producto con ID ${item.productId} no encontrado o no pertenece al usuario`);
      }
      
      validatedItems.push({
        productId: item.productId,
        quantity: qty,
        statusId: item.statusId || statusId
      });
    }

    // Update the purchase return
    const updated = await PurchaseReturn.update(purchaseReturnId, {
      purchaseOrderId,
      statusId,
      notes,
      returnDate,
      items: validatedItems
    }, userId);
    
    if (!updated) {
      return sendResponse(res, 404, 'error', 'No se pudo actualizar la devolución de compra');
    }

    return sendResponse(res, 200, 'success', 'Devolución de compra actualizada', updated);
  } catch (error) {
    console.error('Error al actualizar devolución de compra:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Delete a purchase return
async function deletePurchaseReturn(req, res) {
  try {
    const userId = req.usuario.userId;
    const purchaseReturnId = req.params.id;

    const deleted = await PurchaseReturn.delete(purchaseReturnId, userId);
    if (!deleted) {
      return sendResponse(res, 404, 'error', 'Devolución de compra no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Devolución de compra eliminada');
  } catch (error) {
    console.error('Error al eliminar devolución de compra:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = {
  createPurchaseReturn,
  listPurchaseReturns,
  getPurchaseReturn,
  updatePurchaseReturn,
  deletePurchaseReturn
};
