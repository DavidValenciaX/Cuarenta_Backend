const { check, param, body } = require('express-validator');
const { validateResult } = require('../utils/validate_util');
const xss = require('xss');

const sanitizeText = (value) => {
  return value ? xss(value) : value;
};

// Common validations for items in a sales order
const validateItems = [
  check('items')
    .isArray({min: 1})
    .withMessage('Debe incluir al menos un producto'),
  check('items.*.productId')
    .exists().withMessage('ID de producto es requerido')
    .isInt({min: 1}).withMessage('ID de producto debe ser un número entero positivo'),
  check('items.*.quantity')
    .exists().withMessage('La cantidad es requerida')
    .isInt({min: 1}).withMessage('La cantidad debe ser un número entero positivo')
    .toInt()
];

// Validations for creating a sales order
const validateCreateSalesOrder = [
  check('customerId')
    .exists().withMessage('El ID de cliente es requerido')
    .isInt({min: 1}).withMessage('El ID de cliente debe ser un número entero positivo')
    .toInt(),
  check('statusId')
    .exists().withMessage('El ID de estado es requerido')
    .isInt({min: 1}).withMessage('El ID de estado debe ser un número entero positivo')
    .toInt(),
  check('salesOrderDate')
    .optional()
    .isISO8601().withMessage('La fecha debe tener un formato válido (ISO8601)'),
  check('notes')
    .optional()
    .isLength({max: 1000}).withMessage('Las notas no pueden exceder 1000 caracteres')
    .customSanitizer(sanitizeText),
  ...validateItems,
  validateResult
];

// Validations for updating a sales order
const validateUpdateSalesOrder = [
  param('id')
    .isInt({min: 1}).withMessage('El ID de la orden debe ser un número entero positivo')
    .toInt(),
  check('customerId')
    .exists().withMessage('El ID de cliente es requerido')
    .isInt({min: 1}).withMessage('El ID de cliente debe ser un número entero positivo')
    .toInt(),
  check('statusId')
    .exists().withMessage('El ID de estado es requerido')
    .isInt({min: 1}).withMessage('El ID de estado debe ser un número entero positivo')
    .toInt(),
  check('salesOrderDate')
    .optional()
    .isISO8601().withMessage('La fecha debe tener un formato válido (ISO8601)'),
  check('notes')
    .optional()
    .isLength({max: 1000}).withMessage('Las notas no pueden exceder 1000 caracteres')
    .customSanitizer(sanitizeText),
  ...validateItems,
  validateResult
];

// Validations for fetching or deleting a sales order by ID
const validateSalesOrderId = [
  param('id')
    .isInt({min: 1}).withMessage('El ID de la orden debe ser un número entero positivo')
    .toInt(),
  validateResult
];

module.exports = {
  validateCreateSalesOrder,
  validateUpdateSalesOrder,
  validateSalesOrderId
};
