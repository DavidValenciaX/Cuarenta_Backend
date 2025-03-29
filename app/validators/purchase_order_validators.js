const { body, param } = require('express-validator');
const { validateResult } = require('../utils/validate_util');

// Common validations for items array
const itemsValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto'),
  
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('ID de producto inválido'),
    
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('La cantidad debe ser mayor a 0'),
    
  body('items.*.unitCost')
    .isFloat({ min: 0.01 })
    .withMessage('El costo unitario debe ser mayor a 0')
];

// Common validations for purchase order data
const purchaseOrderValidation = [
  body('supplierId')
    .isInt({ min: 1 })
    .withMessage('ID de proveedor inválido'),

  body('statusId')
    .isInt({ min: 1 })
    .withMessage('Estado de orden inválido'),
    
  body('purchaseOrderDate')
    .optional()
    .isISO8601()
    .withMessage('Formato de fecha inválido'),
    
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Las notas no pueden exceder 1000 caracteres')
    .escape()
];

// Validate purchase order ID parameter
const validatePurchaseOrderId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de orden de compra inválido')
];

// Create purchase order validations
const validateCreatePurchaseOrder = [
  ...purchaseOrderValidation,
  ...itemsValidation,
  validateResult
];

// Update purchase order validations
const validateUpdatePurchaseOrder = [
  ...validatePurchaseOrderId,
  ...purchaseOrderValidation,
  ...itemsValidation,
  validateResult
];

// Get or delete purchase order validation
const validateGetOrDeletePurchaseOrder = [
  ...validatePurchaseOrderId,
  validateResult
];

module.exports = {
  validateCreatePurchaseOrder,
  validateUpdatePurchaseOrder,
  validateGetOrDeletePurchaseOrder
};
