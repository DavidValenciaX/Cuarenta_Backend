const { body, param, query } = require('express-validator');

// Common field validations that will be used for both create and update
const productFieldValidations = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre del producto es requerido')
    .isLength({ max: 100 }).withMessage('El nombre no debe exceder los 100 caracteres')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('La descripción no debe exceder los 500 caracteres')
    .escape(),
  
  body('unitPrice')
    .notEmpty().withMessage('El precio unitario es requerido')
    .isFloat({ min: 0 }).withMessage('El precio unitario debe ser un número positivo')
    .toFloat(),
  
  body('unitCost')
    .notEmpty().withMessage('El costo unitario es requerido')
    .isFloat({ min: 0 }).withMessage('El costo unitario debe ser un número positivo')
    .toFloat(),
  
  // Add a custom validator to check price vs cost relationship
  body('unitPrice').custom((value, { req }) => {
    const unitCost = parseFloat(req.body.unitCost);
    const unitPrice = parseFloat(value);
    
    if (unitPrice <= unitCost) {
      throw new Error('El precio unitario debe ser mayor al costo unitario');
    }
    return true;
  }),

  body('imageUrl')
    .optional()
    .trim()
    .isURL().withMessage('La URL de la imagen debe ser válida')
    .isLength({ max: 255 }).withMessage('La URL de la imagen no debe exceder los 255 caracteres'),
  
  body('categoryId')
    .notEmpty().withMessage('La categoría es requerida')
    .isInt({ min: 1 }).withMessage('La categoría debe ser un número entero positivo')
    .toInt(),
  
  body('unitOfMeasureId')
    .notEmpty().withMessage('La unidad de medida es requerida')
    .isInt({ min: 1 }).withMessage('La unidad de medida debe ser un número entero positivo')
    .toInt(),
  
  body('quantity')
    .optional()
    .isFloat({ min: 0 }).withMessage('La cantidad debe ser un número positivo')
    .toFloat(),
  
  body('barcode')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('El código de barras no debe exceder los 20 caracteres')
    .matches(/^[a-zA-Z0-9]*$/).withMessage('El código de barras solo debe contener letras y números')
];

// Specific validation for product ID in URL parameter
const validateProductId = [
  param('id')
    .isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo')
    .toInt()
];

// Validación para actualizar solo el stock
const validateStockUpdate = [
  body('quantity')
    .notEmpty().withMessage('La cantidad es requerida')
    .isFloat({ min: 0 }).withMessage('La cantidad debe ser un número positivo')
    .toFloat()
];

// Validation for the find product query
const validateFindQuery = [
  query('query')
    .trim()
    .notEmpty().withMessage('El término de búsqueda es requerido')
    .isLength({ min: 1, max: 100 }).withMessage('El término de búsqueda debe tener entre 1 y 100 caracteres')
    .escape()
];

module.exports = {
  validateCreate: productFieldValidations,
  validateUpdate: [...validateProductId, ...productFieldValidations],
  validateId: validateProductId,
  validateStockUpdate,
  validateFindQuery
};
