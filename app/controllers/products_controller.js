const Product = require('../models/products_model');
const Category = require('../models/categories_model');
const Supplier = require('../models/suppliers_model');
const { sendResponse } = require('../utils/response_util');

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function createProduct(req, res) {
  let { name, description, unitPrice, unitCost, categoryId, 
        unitOfMeasureId, quantity, barcode } = req.body;
  const userId = req.usuario.userId;

  // Construir la URL de la imagen si se subió un archivo
  let imageUrl = null;
  if (req.file) {
    imageUrl = `/uploads/products/${req.file.filename}`;
  }

  // Express validator already validated types and required fields
  
  // Normalizar nombre
  name = normalizeName(name);
  
  // Handle barcode - if empty after trim, set to null
  barcode = barcode?.trim() || null;
  
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
  let { name, description, unitPrice, unitCost, imageUrl, categoryId, 
        unitOfMeasureId, quantity, barcode } = req.body;
  const userId = req.usuario.userId;

  // Express validator already validated types and required fields
  
  // Normalizar nombre
  name = normalizeName(name);
  
  // Handle barcode - if empty after trim, set to null
  barcode = barcode?.trim() || null;

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
