const Category = require('../models/categories_model');
const { sendResponse } = require('../utils/response_util');

function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ');
  }

async function createCategory(req, res) {
  let { name } = req.body;
  const user_id = req.usuario.user_id;
  if (!name) return sendResponse(res, 400, 'error', 'El nombre es requerido');

  name = normalizeName(name);

  // Verificar duplicado
  const exists = await Category.findByNameAndUser(name, user_id);
  if (exists) return sendResponse(res, 409, 'error', 'Ya existe una categoría con ese nombre');

  const category = await Category.create(name, user_id);
  return sendResponse(res, 201, 'success', 'Categoría creada', category);
}

async function listCategories(req, res) {
  const user_id = req.usuario.user_id;
  const categories = await Category.findAllByUser(user_id);
  return sendResponse(res, 200, 'success', 'Categorías obtenidas', categories);
}

async function getCategory(req, res) {
  const { id } = req.params;
  const user_id = req.usuario.user_id;
  const category = await Category.findById(id, user_id);
  if (!category) return sendResponse(res, 404, 'error', 'Categoría no encontrada');
  return sendResponse(res, 200, 'success', 'Categoría encontrada', category);
}

async function updateCategory(req, res) {
    const { id } = req.params;
    let { name } = req.body;
    const user_id = req.usuario.user_id;
    if (!name) return sendResponse(res, 400, 'error', 'El nombre es requerido');
  
    name = normalizeName(name);
  
    const exists = await Category.findByNameAndUser(name, user_id);
    if (exists && exists.id !== Number(id)) {
      return sendResponse(res, 409, 'error', 'Ya existe una categoría con ese nombre');
    }
  
    const updated = await Category.update(id, name, user_id);
    if (!updated) return sendResponse(res, 404, 'error', 'Categoría no encontrada');
    return sendResponse(res, 200, 'success', 'Categoría actualizada', updated);
  }

async function deleteCategory(req, res) {
  const { id } = req.params;
  const user_id = req.usuario.user_id;
  const deleted = await Category.delete(id, user_id);
  if (!deleted) return sendResponse(res, 404, 'error', 'Categoría no encontrada');
  return sendResponse(res, 200, 'success', 'Categoría eliminada');
}

module.exports = { createCategory, listCategories, getCategory, updateCategory, deleteCategory };
