const InventoryTransaction = require('../models/inventory_transactions_model');
const Product = require('../models/products_model');
const { sendResponse } = require('../utils/response_util');

// Get transaction history for a specific product
async function getProductTransactions(req, res) {
  try {
    const userId = req.usuario.userId;
    const productId = req.params.id;
    
    // Verify product exists and belongs to user
    const product = await Product.findById(productId, userId);
    if (!product) {
      return sendResponse(res, 404, 'error', 'Producto no encontrado');
    }
    
    const transactions = await InventoryTransaction.getProductTransactions(productId, userId);
    return sendResponse(res, 200, 'success', 'Historial de transacciones obtenido', {
      product,
      transactions
    });
  } catch (error) {
    console.error('Error al obtener el historial de transacciones:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

// Get all inventory transactions for the user (with pagination)
async function getUserTransactions(req, res) {
  try {
    const userId = req.usuario.userId;
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const transactions = await InventoryTransaction.getUserTransactions(userId, limit, offset);
    return sendResponse(res, 200, 'success', 'Historial de transacciones obtenido', transactions);
  } catch (error) {
    console.error('Error al obtener el historial de transacciones:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = {
  getProductTransactions,
  getUserTransactions
};
