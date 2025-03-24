const Customer = require('../models/customers_model');
const { sendResponse } = require('../utils/response_util');

function normalize(str) {
  return str.trim().replace(/\s+/g, ' ');
}

async function createCustomer(req, res) {
  let { name, email, phone, address } = req.body;
  const user_id = req.usuario.user_id;
  
  if (!name || !email || !phone || !address) 
    return sendResponse(res, 400, 'error', 'Todos los campos son requeridos');

  name = normalize(name);
  email = email.trim();

  if (await Customer.findByEmailAndUser(email, user_id))
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese correo');

  if (await Customer.findByNameAndUser(name, user_id))
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese nombre');

  const customer = await Customer.create({ name, email, phone, address, user_id });
  return sendResponse(res, 201, 'success', 'Cliente creado exitosamente', customer);
}

async function listCustomers(req, res) {
  const customers = await Customer.findAllByUser(req.usuario.user_id);
  return sendResponse(res, 200, 'success', 'Clientes obtenidos', customers);
}

async function getCustomer(req, res) {
  const customer = await Customer.findById(req.params.id, req.usuario.user_id);
  if (!customer) return sendResponse(res, 404, 'error', 'Cliente no encontrado');
  return sendResponse(res, 200, 'success', 'Cliente encontrado', customer);
}

async function updateCustomer(req, res) {
  let { name, email, phone, address } = req.body;
  const user_id = req.usuario.user_id;
  const id = Number(req.params.id);
  
  if (!name || !email || !phone || !address)
    return sendResponse(res, 400, 'error', 'Todos los campos son requeridos');
  
  name = normalize(name);
  email = email.trim();

  const byEmail = await Customer.findByEmailAndUser(email, user_id);
  if (byEmail && byEmail.id !== id)
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese correo');

  const byName = await Customer.findByNameAndUser(name, user_id);
  if (byName && byName.id !== id)
    return sendResponse(res, 409, 'error', 'Ya existe un cliente con ese nombre');

  const updated = await Customer.update(id, { name, email, phone, address }, user_id);
  if (!updated) return sendResponse(res, 404, 'error', 'Cliente no encontrado');
  return sendResponse(res, 200, 'success', 'Cliente actualizado', updated);
}

async function deleteCustomer(req, res) {
  const deleted = await Customer.delete(req.params.id, req.usuario.user_id);
  if (!deleted) return sendResponse(res, 404, 'error', 'Cliente no encontrado');
  return sendResponse(res, 200, 'success', 'Cliente eliminado');
}

module.exports = { createCustomer, listCustomers, getCustomer, updateCustomer, deleteCustomer };
