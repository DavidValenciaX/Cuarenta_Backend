const Category = require('../models/categories_model');
const { sendResponse } = require('../utils/response_util');

function normalizeName(name) {
    return name.trim().replace(/\s+/g, ' ');
}

async function createCategory(req, res) {
  try {
    let { name } = req.body;
    const userId = req.usuario.userId;
    
    name = normalizeName(name);

    // Verificar duplicado
    const exists = await Category.findByNameAndUser(name, userId);
    if (exists) return sendResponse(res, 409, 'error', 'Ya existe una categoría con ese nombre');

    const category = await Category.create(name, userId);
    return sendResponse(res, 201, 'success', 'Categoría creada', category);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    return sendResponse(res, 500, 'error', 'Error al crear la categoría', { details: error.message });
  }
}

async function listCategories(req, res) {
  const userId = req.usuario.userId;
  const categories = await Category.findAllByUser(userId);
  return sendResponse(res, 200, 'success', 'Categorías obtenidas', categories);
}

async function getCategory(req, res) {
  const { id } = req.params;
  const userId = req.usuario.userId;
  const category = await Category.findById(id, userId);
  if (!category) return sendResponse(res, 404, 'error', 'Categoría no encontrada');
  return sendResponse(res, 200, 'success', 'Categoría encontrada', category);
}

async function updateCategory(req, res) {
    const { id } = req.params;
    let { name } = req.body;
    const userId = req.usuario.userId;
    
    name = normalizeName(name);
  
    const exists = await Category.findByNameAndUser(name, userId);
    if (exists && exists.id !== Number(id)) {
      return sendResponse(res, 409, 'error', 'Ya existe una categoría con ese nombre');
    }
  
    const updated = await Category.update(id, name, userId);
    if (!updated) return sendResponse(res, 404, 'error', 'Categoría no encontrada');
    return sendResponse(res, 200, 'success', 'Categoría actualizada', updated);
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;
    const userId = req.usuario.userId;
    const deleted = await Category.delete(id, userId);
    if (!deleted) return sendResponse(res, 404, 'error', 'Categoría no encontrada');                                                                 
    return sendResponse(res, 200, 'success', 'Categoría eliminada');
  } catch (error) {
    // Check for foreign key constraint violation
    if (error.code === '23503' && error.constraint === 'products_category_id_fkey') {
      return sendResponse(res, 409, 'error', 'No se puede eliminar la categoría porque tiene productos asociados');
    }
    console.error('Error al eliminar categoría:', error);
    return sendResponse(res, 500, 'error', 'Error al eliminar la categoría', { details: error.message });              
  }
}

module.exports = { createCategory, listCategories, getCategory, updateCategory, deleteCategory };
