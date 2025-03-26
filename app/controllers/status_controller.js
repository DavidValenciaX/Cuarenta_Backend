const Status = require('../models/status_model');
const { sendResponse } = require('../utils/response_util');

async function listStatusWithCategories(req, res) {
  try {
    const statusCategories = await Status.getAllStatusWithCategories();
    return sendResponse(res, 200, 'success', 'Estados obtenidos exitosamente', { status_categories: statusCategories });
  } catch (error) {
    console.error('Error al listar estados:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = { listStatusWithCategories };
