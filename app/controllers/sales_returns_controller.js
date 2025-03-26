const SalesReturn = require('../models/sales_returns_model');
const SalesOrder = require('../models/sales_orders_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Helper function to convert values to numbers
function toNumber(value) {
  const n = Number(value);
  return isNaN(n) ? null : n;
}

// Create a sales return with its items
async function createSalesReturn(req, res) {
  try {
    const userId = req.usuario.userId;
    const { salesOrderId, statusId, returnDate, notes, items } = req.body;

    // Validate required fields
    if (!salesOrderId || statusId == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Orden de venta, estado y al menos un producto son requeridos');
    }
    
    // Validate sales order
    const salesOrder = await SalesOrder.validateSalesOrder(salesOrderId, userId);
    if (!salesOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada o no pertenece al usuario');
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

    // Create the sales return
    const salesReturn = await SalesReturn.create({
      userId,
      salesOrderId,
      statusId,
      notes,
      returnDate,
      items: validatedItems
    });
    
    return sendResponse(res, 201, 'success', 'Devolución de venta creada exitosamente', salesReturn);
  } catch (error) {
    console.error('Error al crear devolución de venta:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Get all sales returns for a user
async function listSalesReturns(req, res) {
  try {
    const userId = req.usuario.userId;
    const salesReturns = await SalesReturn.findAllByUser(userId);
    return sendResponse(res, 200, 'success', 'Devoluciones de venta obtenidas', salesReturns);
  } catch (error) {
    console.error('Error al listar devoluciones de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get a specific sales return with its items
async function getSalesReturn(req, res) {
  try {
    const salesReturnId = req.params.id;
    const userId = req.usuario.userId;

    const salesReturn = await SalesReturn.findById(salesReturnId, userId);
    if (!salesReturn) {
      return sendResponse(res, 404, 'error', 'Devolución de venta no encontrada');
    }

    // Get the items for this sales return
    const items = await SalesReturn.getItems(salesReturnId, userId);
    
    // Combine return and items data
    const result = {
      ...salesReturn,
      items
    };

    return sendResponse(res, 200, 'success', 'Devolución de venta encontrada', result);
  } catch (error) {
    console.error('Error al obtener devolución de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Update a sales return
async function updateSalesReturn(req, res) {
  try {
    const userId = req.usuario.userId;
    const salesReturnId = req.params.id;
    const { salesOrderId, statusId, returnDate, notes, items } = req.body;

    // Validate required fields
    if (!salesOrderId || statusId == null || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, 400, 'error', 'Orden de venta, estado y al menos un producto son requeridos');
    }

    // Validate sales order belongs to user
    const salesOrder = await SalesOrder.validateSalesOrder(salesOrderId, userId);
    if (!salesOrder) {
      return sendResponse(res, 404, 'error', 'Orden de venta no encontrada o no pertenece al usuario');
    }

    // Validate the return exists
    const existingSalesReturn = await SalesReturn.findById(salesReturnId, userId);
    if (!existingSalesReturn) {
      return sendResponse(res, 404, 'error', 'Devolución de venta no encontrada');
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

    // Update the sales return
    const updated = await SalesReturn.update(salesReturnId, {
      salesOrderId,
      statusId,
      notes,
      returnDate,
      items: validatedItems
    }, userId);
    
    if (!updated) {
      return sendResponse(res, 404, 'error', 'No se pudo actualizar la devolución de venta');
    }

    return sendResponse(res, 200, 'success', 'Devolución de venta actualizada', updated);
  } catch (error) {
    console.error('Error al actualizar devolución de venta:', error);
    return sendResponse(res, 500, 'error', error.message || 'Error interno del servidor');
  }
}

// Delete a sales return
async function deleteSalesReturn(req, res) {
  try {
    const userId = req.usuario.userId;
    const salesReturnId = req.params.id;

    const deleted = await SalesReturn.delete(salesReturnId, userId);
    if (!deleted) {
      return sendResponse(res, 404, 'error', 'Devolución de venta no encontrada');
    }

    return sendResponse(res, 200, 'success', 'Devolución de venta eliminada');
  } catch (error) {
    console.error('Error al eliminar devolución de venta:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = {
  createSalesReturn,
  listSalesReturns,
  getSalesReturn,
  updateSalesReturn,
  deleteSalesReturn
};
