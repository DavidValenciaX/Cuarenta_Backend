const { body } = require('express-validator');

const createSupplierValidation = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 255 }).withMessage('El nombre no puede exceder 255 caracteres')
    .trim()
    .escape(),
  
  body('email')
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Debe ser un correo electrónico válido')
    .isLength({ max: 255 }).withMessage('El correo no puede exceder 255 caracteres')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .isLength({ max: 100 }).withMessage('El teléfono no puede exceder 100 caracteres')
    .matches(/^[0-9+\-\s()]*$/).withMessage('El teléfono solo puede contener números, +, -, espacios y paréntesis')
    .trim(),
  
  body('address')
    .notEmpty().withMessage('La dirección es obligatoria')
    .isLength({ max: 255 }).withMessage('La dirección no puede exceder 255 caracteres')
    .trim()
    .escape()
];

const updateSupplierValidation = [
  body('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 255 }).withMessage('El nombre no puede exceder 255 caracteres')
    .trim()
    .escape(),
  
  body('email')
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Debe ser un correo electrónico válido')
    .isLength({ max: 255 }).withMessage('El correo no puede exceder 255 caracteres')
    .normalizeEmail(),
  
  body('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .isLength({ max: 100 }).withMessage('El teléfono no puede exceder 100 caracteres')
    .matches(/^[0-9+\-\s()]*$/).withMessage('El teléfono solo puede contener números, +, -, espacios y paréntesis')
    .trim(),
  
  body('address')
    .notEmpty().withMessage('La dirección es obligatoria')
    .isLength({ max: 255 }).withMessage('La dirección no puede exceder 255 caracteres')
    .trim()
    .escape()
];

module.exports = {
  createSupplierValidation,
  updateSupplierValidation
};
