const Product = require('../models/products_model');
const Category = require('../models/categories_model');
const Supplier = require('../models/suppliers_model');
const { sendResponse } = require('../utils/response_util');

function normalizeName(name) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function createProduct(req, res) {
  try {
    let { name, description, unitPrice, unitCost, categoryId, 
          unitOfMeasureId, quantity, barcode } = req.body;
    const userId = req.usuario.userId;

    // Validate that price is greater than cost
    if (Number(unitPrice) <= Number(unitCost)) {
      return sendResponse(res, 400, 'error', 'El precio unitario debe ser mayor al costo unitario');
    }

    // Construir la URL de la imagen si se subió un archivo
    let imageUrl = null;
    console.log('Request file:', req.file);
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
      console.log('Setting imageUrl to:', imageUrl);
    } else {
      console.log('No file uploaded with request');
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
  } catch (error) {
    // Check for our custom error from the model
    if (error.statusCode) {
      return sendResponse(res, error.statusCode, 'error', error.message);
    }
    
    console.error(error);
    return sendResponse(res, 500, 'error', 'Error al crear el producto');
  }
}

async function updateProduct(req, res) {
  try {
    const id = Number(req.params.id);
    let { name, description, unitPrice, unitCost, categoryId, 
          unitOfMeasureId, quantity, barcode } = req.body;
    const userId = req.usuario.userId;

    // Validate that price is greater than cost
    if (Number(unitPrice) <= Number(unitCost)) {
      return sendResponse(res, 400, 'error', 'El precio unitario debe ser mayor al costo unitario');
    }

    // Construir la URL de la imagen si se subió un archivo
    let imageUrl = undefined; // undefined para no actualizar si no se envía imagen
    console.log('Request file:', req.file);
    if (req.file) {
      imageUrl = `/uploads/products/${req.file.filename}`;
      console.log('Setting imageUrl to:', imageUrl);
    } else {
      console.log('No file uploaded with update request');
    }
    
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

    // Si no se proporciona una nueva imagen, obtener la URL de imagen existente
    if (imageUrl === undefined) {
      const existingProduct = await Product.findById(id, userId);
      if (existingProduct) {
        imageUrl = existingProduct.image_url;
      }
    }

    const updated = await Product.update(id, {
      name, description, unitPrice, unitCost,
      imageUrl, categoryId,
      unitOfMeasureId, quantity, barcode
    }, userId);

    if (!updated) return sendResponse(res, 404, 'error', 'Producto no encontrado');
    return sendResponse(res, 200, 'success', 'Producto actualizado', updated);
  } catch (error) {
    if (error.statusCode) {
      return sendResponse(res, error.statusCode, 'error', error.message);
    }
    
    console.error(error);
    return sendResponse(res, 500, 'error', 'Error al actualizar el producto');
  }
}

async function updateProductStock(req, res) {
  try {
    const id = Number(req.params.id);
    const { quantity } = req.body;
    const userId = req.usuario.userId;

    // Buscar producto existente
    const product = await Product.findById(id, userId);
    if (!product) {
      return sendResponse(res, 404, 'error', 'Producto no encontrado');
    }

    // Actualizar cantidad usando el método de ajuste
    const updated = await Product.adjustQuantity(id, userId, Number(quantity) - Number(product.quantity));
    if (!updated) {
      return sendResponse(res, 404, 'error', 'Producto no encontrado');
    }
    return sendResponse(res, 200, 'success', 'Stock actualizado', updated);
  } catch (error) {
    if (error.statusCode) {
      return sendResponse(res, error.statusCode, 'error', error.message);
    }
    console.error(error);
    return sendResponse(res, 500, 'error', 'Error al actualizar el stock');
  }
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
  try {
    const deleted = await Product.delete(req.params.id, req.usuario.userId);
    if (!deleted) return sendResponse(res, 404, 'error', 'Producto no encontrado');
    return sendResponse(res, 200, 'success', 'Producto eliminado');
  } catch (error) {
    if (error.statusCode === 409 && error.dependencies) {
      const deps = error.dependencies;
      const details = [];
      if (deps.salesOrders > 0) details.push(`${deps.salesOrders} órdenes de venta`);
      if (deps.purchaseOrders > 0) details.push(`${deps.purchaseOrders} órdenes de compra`);
      if (deps.salesReturns > 0) details.push(`${deps.salesReturns} devoluciones de venta`);
      if (deps.purchaseReturns > 0) details.push(`${deps.purchaseReturns} devoluciones de compra`);
      
      const message = `No se puede eliminar el producto porque está asociado a: ${details.join(', ')}`;
      return sendResponse(res, 409, 'error', message);
    }
    
    console.error(error);
    return sendResponse(res, 500, 'error', 'Error al eliminar el producto');
  }
}

async function findProduct(req, res) {
  try {
    const { query } = req.query; // Changed from req.body to req.query
    const userId = req.usuario.userId;

    const products = await Product.findByQueryAndUser(query, userId);

    if (products && products.length > 0) {
      return sendResponse(res, 200, 'success', 'Productos encontrados', products.map(product => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        barcode: product.barcode,
        unitPrice: product.unit_price,
        imageUrl: product.image_url
      })));
    } else {
      return sendResponse(res, 200, 'success', 'No se encontraron productos', []);
    }
  } catch (error) {
    console.error('Error in findProduct:', error);
    return sendResponse(res, 500, 'error', 'Error al buscar el producto');
  }
}

module.exports = { createProduct, updateProduct, listProducts, getProduct, deleteProduct, updateProductStock, findProduct };
