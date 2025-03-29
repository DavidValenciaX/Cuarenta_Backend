const { body, param } = require('express-validator');

// General validators
const salesOrderIdValidator = body('salesOrderId')
  .notEmpty().withMessage('ID de orden de venta es requerido')
  .isInt({ min: 1 }).withMessage('ID de orden de venta debe ser un número entero positivo')
  .toInt();

const returnDateValidator = body('returnDate')
  .optional()
  .isISO8601().withMessage('Fecha de devolución debe ser una fecha válida en formato ISO8601')
  .toDate();

const notesValidator = body('notes')
  .optional()
  .isString().withMessage('Notas debe ser un texto')
  .isLength({ max: 1000 }).withMessage('Notas no debe exceder 1000 caracteres')
  .trim()
  .escape();

const itemsValidator = body('items')
  .isArray({ min: 1 }).withMessage('Al menos un producto debe ser incluido en la devolución')
  .withMessage('Se requiere un array de productos');

const itemProductIdValidator = body('items.*.productId')
  .notEmpty().withMessage('ID de producto es requerido')
  .isInt({ min: 1 }).withMessage('ID de producto debe ser un número entero positivo')
  .toInt();

const itemQuantityValidator = body('items.*.quantity')
  .notEmpty().withMessage('La cantidad es requerida')
  .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero mayor a 0')
  .toInt();

const itemStatusIdValidator = body('items.*.statusId')
  .notEmpty().withMessage('El estado del producto es requerido')
  .isInt({ min: 1 }).withMessage('ID de estado debe ser un número entero positivo')
  .toInt();

const idParamValidator = param('id')
  .notEmpty().withMessage('ID de devolución es requerido')
  .isInt({ min: 1 }).withMessage('ID de devolución debe ser un número entero positivo')
  .toInt();

// Combined validators for different operations
const createSalesReturnValidators = [
  salesOrderIdValidator,
  returnDateValidator,
  notesValidator,
  itemsValidator,
  itemProductIdValidator,
  itemQuantityValidator,
  itemStatusIdValidator
];

const updateSalesReturnValidators = [
  idParamValidator,
  salesOrderIdValidator,
  returnDateValidator,
  notesValidator,
  itemsValidator,
  itemProductIdValidator,
  itemQuantityValidator,
  itemStatusIdValidator
];

const getSalesReturnValidator = [
  idParamValidator
];

const deleteSalesReturnValidator = [
  idParamValidator
];

module.exports = {
  createSalesReturnValidators,
  updateSalesReturnValidators,
  getSalesReturnValidator,
  deleteSalesReturnValidator
};
