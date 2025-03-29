const { check, param, body } = require('express-validator');

// Common validations for items array
const validateItemsArray = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto en la devolución'),
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('El ID del producto debe ser un número entero positivo'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser un número entero positivo')
];

// Validations for creating a purchase return
const createPurchaseReturnValidator = [
  body('purchaseOrderId')
    .notEmpty()
    .withMessage('El ID de la orden de compra es obligatorio')
    .isInt({ min: 1 })
    .withMessage('El ID de la orden de compra debe ser un número entero positivo'),
  
  body('returnDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de devolución debe tener un formato válido (YYYY-MM-DD)'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Las notas deben ser texto')
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder los 1000 caracteres')
    .trim()
    .escape(),
  
  ...validateItemsArray
];

// Validations for updating a purchase return
const updatePurchaseReturnValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la devolución debe ser un número entero positivo'),
  
  body('purchaseOrderId')
    .notEmpty()
    .withMessage('El ID de la orden de compra es obligatorio')
    .isInt({ min: 1 })
    .withMessage('El ID de la orden de compra debe ser un número entero positivo'),
  
  body('returnDate')
    .optional()
    .isISO8601()
    .withMessage('La fecha de devolución debe tener un formato válido (YYYY-MM-DD)'),
  
  body('notes')
    .optional()
    .isString()
    .withMessage('Las notas deben ser texto')
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder los 1000 caracteres')
    .trim()
    .escape(),
  
  ...validateItemsArray
];

// Validations for retrieving or deleting a purchase return by ID
const idParamValidator = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID de la devolución debe ser un número entero positivo')
];

module.exports = {
  createPurchaseReturnValidator,
  updatePurchaseReturnValidator,
  idParamValidator
};
