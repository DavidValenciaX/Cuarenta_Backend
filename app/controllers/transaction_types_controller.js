const TransactionType = require('../models/transaction_types_model');
const { sendResponse } = require('../utils/response_util');

async function listTransactionTypes(req, res) {
  try {
    const transactionTypes = await TransactionType.getAll();
    return sendResponse(res, 200, 'success', 'Tipos de transacción obtenidos exitosamente', transactionTypes);
  } catch (error) {
    console.error('Error al listar tipos de transacción:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = {
  listTransactionTypes,
};
