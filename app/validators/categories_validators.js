const { check, param } = require('express-validator');

// Validaciones compartidas para el campo 'name'
const nameValidations = [
  check('name')
    .exists().withMessage('El nombre es requerido')
    .notEmpty().withMessage('El nombre no puede estar vacío')
    .isLength({ min: 2, max: 50 }).withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s\-()]+$/).withMessage('El nombre solo puede contener letras, números, espacios, guiones, paréntesis y barras')
    .trim()
    .escape() // Previene XSS sanitizando la entrada
];

// Validaciones para el parámetro ID
const idValidations = [
  param('id')
    .isInt().withMessage('El ID debe ser un número entero')
    .toInt()
];

// Validadores específicos por ruta
const validateCreate = nameValidations;

const validateUpdate = [
  ...idValidations,
  ...nameValidations
];

const validateGetById = idValidations;

const validateDelete = idValidations;

module.exports = {
  validateCreate,
  validateUpdate,
  validateGetById,
  validateDelete
};
