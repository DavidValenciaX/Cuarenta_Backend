const Product = require('../models/products_model');
const Category = require('../models/categories_model');
const Supplier = require('../models/suppliers_model');
const { sendResponse } = require('../utils/response_util');

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function createProduct(req, res) {
  let {
    name, description,
    unitPrice, unitCost,
    imageUrl,
    categoryId, unitOfMeasureId,
    quantity, barcode
  } = req.body;
  const userId = req.usuario.userId;

  // Campos requeridos
  if (!name || unitPrice == null || unitCost == null || !categoryId || !unitOfMeasureId) {
    return sendResponse(res, 400, 'error', 'Faltan campos requeridos');
  }

  // Convertir y validar numéricos
  unitPrice = Number(unitPrice);
  unitCost = Number(unitCost);
  categoryId = Number(categoryId);
  unitOfMeasureId = Number(unitOfMeasureId);
  quantity = quantity == null ? 0 : Number(quantity);

  if ([unitPrice, unitCost, categoryId, unitOfMeasureId, quantity]
      .some(v => isNaN(v))) {
    return sendResponse(res, 400, 'error', 'Los campos numéricos deben ser válidos');
  }

  // Normalizar
  name = normalizeName(name);

  barcode = typeof barcode === 'string' ? barcode.trim() : String(barcode || '').trim();
  if (barcode === '') barcode = null;
  
  // Unicidad nombre
  if (await Product.findByNameAndUser(name, userId)) {
    return sendResponse(res, 409, 'error', 'Ya existe un producto con ese nombre');
  }

  // Unicidad barcode
  if (barcode && await Product.findByBarcodeAndUser(barcode, userId)) {
    return sendResponse(res, 409, 'error', 'Código de barras ya registrado');
  }

  // Verificar relaciones pertenecen al usuario
  if (!await Category.findById(categoryId, userId)) {
    return sendResponse(res, 404, 'error', 'Categoría no encontrada');
  }

  const product = await Product.create({
    name, description, unitPrice, unitCost,
    imageUrl, categoryId,
    unitOfMeasureId, quantity, barcode, userId
  });
  return sendResponse(res, 201, 'success', 'Producto creado', product);
}

async function updateProduct(req, res) {
  const id = Number(req.params.id);
  let {
    name, description,
    unitPrice, unitCost,
    imageUrl,
    categoryId, unitOfMeasureId,
    quantity, barcode
  } = req.body;
  const userId = req.usuario.userId;

  if (!name || unitPrice == null || unitCost == null || !categoryId || !unitOfMeasureId) {
    return sendResponse(res, 400, 'error', 'Faltan campos requeridos');
  }

  unitPrice = Number(unitPrice);
  unitCost = Number(unitCost);
  categoryId = Number(categoryId);
  unitOfMeasureId = Number(unitOfMeasureId);
  quantity = quantity == null ? 0 : Number(quantity);

  if ([unitPrice, unitCost, categoryId, unitOfMeasureId, quantity]
      .some(v => isNaN(v))) {
    return sendResponse(res, 400, 'error', 'Los campos numéricos deben ser válidos');
  }

  name = normalizeName(name);
  
  barcode = typeof barcode === 'string' ? barcode.trim() : String(barcode || '').trim();
  if (barcode === '') barcode = null;

  const existingByName = await Product.findByNameAndUser(name, userId);
  if (existingByName && existingByName.id !== id) {
    return sendResponse(res, 409, 'error', 'Ya existe un producto con ese nombre');
  }

  const existingByBarcode = barcode && await Product.findByBarcodeAndUser(barcode, userId);
  if (existingByBarcode && existingByBarcode.id !== id) {
    return sendResponse(res, 409, 'error', 'Código de barras ya registrado');
  }

  if (!await Category.findById(categoryId, userId)) {
    return sendResponse(res, 404, 'error', 'Categoría no encontrada');
  }

  const updated = await Product.update(id, {
    name, description, unitPrice, unitCost,
    imageUrl, categoryId,
    unitOfMeasureId, quantity, barcode
  }, userId);

  if (!updated) return sendResponse(res, 404, 'error', 'Producto no encontrado');
  return sendResponse(res, 200, 'success', 'Producto actualizado', updated);
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

async function deleteProduct(req, res) {
  const deleted = await Product.delete(req.params.id, req.usuario.userId);
  if (!deleted) return sendResponse(res, 404, 'error', 'Producto no encontrado');
  return sendResponse(res, 200, 'success', 'Producto eliminado');
}

module.exports = { createProduct, updateProduct, listProducts, getProduct, deleteProduct };
