const Product = require('../models/products_model');
const Category = require('../models/categories_model');
const Supplier = require('../models/suppliers_model');
const { sendResponse } = require('../utils/response_util');

// Función de normalización: trim, reemplaza espacios múltiples y convierte a minúsculas
function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function createProduct(req, res) {
  let { name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id } = req.body;
  const userId = req.usuario.userId;

  // Validación de campos requeridos
  if (!name || unit_price === undefined || unit_cost === undefined || !supplier_id || !category_id || !unit_of_measure_id) {
    return sendResponse(res, 400, 'error', 'Faltan campos requeridos');
  }

  // Validar y convertir los campos numéricos
  unit_price = Number(unit_price);
  unit_cost = Number(unit_cost);
  supplier_id = Number(supplier_id);
  category_id = Number(category_id);
  unit_of_measure_id = Number(unit_of_measure_id);

  if (isNaN(unit_price) || isNaN(unit_cost) || isNaN(supplier_id) || isNaN(category_id) || isNaN(unit_of_measure_id)) {
    return sendResponse(res, 400, 'error', 'Los campos numéricos deben ser números');
  }

  // Normalización del nombre del producto
  name = normalizeName(name);

  // Verificar unicidad del nombre para el usuario
  const exists = await Product.findByNameAndUser(name, userId);
  if (exists) return sendResponse(res, 409, 'error', 'Ya existe un producto con ese nombre');

  // Verificar que la categoría pertenezca al usuario
  const category = await Category.findById(category_id, userId);
  if (!category) return sendResponse(res, 404, 'error', 'Categoría no encontrada o no pertenece al usuario');

  // Verificar que el proveedor pertenezca al usuario
  const supplier = await Supplier.findById(supplier_id, userId);
  if (!supplier) return sendResponse(res, 404, 'error', 'Proveedor no encontrado o no pertenece al usuario');

  // Crear el producto
  const product = await Product.create({ name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id, userId });
  return sendResponse(res, 201, 'success', 'Producto creado', product);
}

async function listProducts(req, res) {
  const products = await Product.findAllByUser(req.usuario.userId);
  return sendResponse(res, 200, 'success', 'Productos obtenidos', products);
}

async function getProduct(req, res) {
  const product = await Product.findById(req.params.id, req.usuario.userId);
  if (!product) return sendResponse(res, 404, 'error', 'Producto no encontrado');
  return sendResponse(res, 200, 'success', 'Producto encontrado', product);
}

async function updateProduct(req, res) {
  const { id } = req.params;
  let { name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id } = req.body;
  const userId = req.usuario.userId;
  const productId = Number(id);

  if (!name || unit_price === undefined || unit_cost === undefined || !supplier_id || !category_id || !unit_of_measure_id) {
    return sendResponse(res, 400, 'error', 'Faltan campos requeridos');
  }

  // Validar y convertir los campos numéricos
  unit_price = Number(unit_price);
  unit_cost = Number(unit_cost);
  supplier_id = Number(supplier_id);
  category_id = Number(category_id);
  unit_of_measure_id = Number(unit_of_measure_id);

  if (isNaN(unit_price) || isNaN(unit_cost) || isNaN(supplier_id) || isNaN(category_id) || isNaN(unit_of_measure_id)) {
    return sendResponse(res, 400, 'error', 'Los campos numéricos deben ser números');
  }

  // Normalizar el nombre
  name = normalizeName(name);

  // Verificar unicidad del nombre, excluyendo el producto actual
  const exists = await Product.findByNameAndUser(name, userId);
  if (exists && exists.id !== productId) return sendResponse(res, 409, 'error', 'Ya existe un producto con ese nombre');

  // Verificar que la categoría pertenezca al usuario
  const category = await Category.findById(category_id, userId);
  if (!category) return sendResponse(res, 404, 'error', 'Categoría no encontrada o no pertenece al usuario');

  // Verificar que el proveedor pertenezca al usuario
  const supplier = await Supplier.findById(supplier_id, userId);
  if (!supplier) return sendResponse(res, 404, 'error', 'Proveedor no encontrado o no pertenece al usuario');

  const updated = await Product.update(productId, { name, description, unit_price, unit_cost, supplier_id, image_url, category_id, unit_of_measure_id }, userId);
  if (!updated) return sendResponse(res, 404, 'error', 'Producto no encontrado');
  return sendResponse(res, 200, 'success', 'Producto actualizado', updated);
}

async function deleteProduct(req, res) {
  const deleted = await Product.delete(req.params.id, req.usuario.userId);
  if (!deleted) return sendResponse(res, 404, 'error', 'Producto no encontrado');
  return sendResponse(res, 200, 'success', 'Producto eliminado');
}

module.exports = { createProduct, listProducts, getProduct, updateProduct, deleteProduct };
