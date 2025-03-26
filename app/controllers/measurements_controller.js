const Measurement = require('../models/measurements_model');
const { sendResponse } = require('../utils/response_util');

async function listMeasurements(req, res) {
  try {
    const measurementTypes = await Measurement.getAllMeasurementTypes();
    return sendResponse(res, 200, 'success', 'Datos de medidas obtenidos exitosamente', { measurement_types: measurementTypes });
  } catch (error) {
    console.error('Error al listar medidas:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = { listMeasurements };
