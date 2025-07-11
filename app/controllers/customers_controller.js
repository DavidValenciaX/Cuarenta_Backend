const Customer = require('../models/customers_model');
const { sendResponse } = require('../utils/response_util');

function normalize(str) {
  return str.trim().replace(/\s+/g, ' ');
}

async function createCustomer(req, res) {
  let { name, email, phone, address } = req.body;
  const userId = req.usuario.userId;
  
  // Express-validator already validated required fields and formats
  name = normalize(name);
  email = email.trim();

  if (await Customer.findByEmailAndUser(email, userId))
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese correo');

  if (await Customer.findByNameAndUser(name, userId))
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese nombre');

  const customer = await Customer.create({ name, email, phone, address, userId });
  return sendResponse(res, 201, 'success', 'Cliente creado exitosamente', customer);
}

async function listCustomers(req, res) {
  const customers = await Customer.findAllByUser(req.usuario.userId);
  return sendResponse(res, 200, 'success', 'Clientes obtenidos', customers);
}

async function getCustomer(req, res) {
  const customer = await Customer.findById(req.params.id, req.usuario.userId);
  if (!customer) return sendResponse(res, 404, 'error', 'Cliente no encontrado');
  return sendResponse(res, 200, 'success', 'Cliente encontrado', customer);
}

async function updateCustomer(req, res) {
  let { name, email, phone, address } = req.body;
  const userId = req.usuario.userId;
  const id = Number(req.params.id);
  
  // Express-validator already validated required fields and formats
  name = normalize(name);
  email = email.trim();

  const byEmail = await Customer.findByEmailAndUser(email, userId);
  if (byEmail && byEmail.id !== id)
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese correo');

  const byName = await Customer.findByNameAndUser(name, userId);
  if (byName && byName.id !== id)
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese nombre');

  const updated = await Customer.update(id, { name, email, phone, address }, userId);
  if (!updated) return sendResponse(res, 404, 'error', 'Cliente no encontrado');
  return sendResponse(res, 200, 'success', 'Cliente actualizado', updated);
}

async function deleteCustomer(req, res) {
  try {
    const deleted = await Customer.delete(req.params.id, req.usuario.userId);
    if (!deleted) return sendResponse(res, 404, 'error', 'Cliente no encontrado');
    return sendResponse(res, 200, 'success', 'Cliente eliminado');
  } catch (error) {
    if (error.statusCode === 409) {
      return sendResponse(res, 409, 'error', error.message, error.dependencies);
    }
    throw error;
  }
}

module.exports = { createCustomer, listCustomers, getCustomer, updateCustomer, deleteCustomer };
