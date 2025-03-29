const { check } = require('express-validator');

const createCustomerValidator = [
  check('name')
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ max: 255 }).withMessage('El nombre no debe exceder los 255 caracteres')
    .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\,\-\'\"]+$/).withMessage('El nombre contiene caracteres no permitidos')
    .trim(),
    
  check('email')
    .notEmpty().withMessage('El correo electrónico es obligatorio')
    .isEmail().withMessage('Formato de correo electrónico inválido')
    .isLength({ max: 255 }).withMessage('El correo no debe exceder los 255 caracteres')
    .normalizeEmail(),
    
  check('phone')
    .notEmpty().withMessage('El teléfono es obligatorio')
    .isLength({ max: 100 }).withMessage('El teléfono no debe exceder los 100 caracteres')
    .matches(/^[0-9\+\-\(\)\s]+$/).withMessage('El teléfono contiene caracteres no permitidos')
    .trim(),
    
  check('address')
    .notEmpty().withMessage('La dirección es obligatoria')
    .isLength({ max: 255 }).withMessage('La dirección no debe exceder los 255 caracteres')
    .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\.\,\-\#\/]+$/).withMessage('La dirección contiene caracteres no permitidos')
    .trim()
];

// Reutilizar las mismas validaciones para actualización
const updateCustomerValidator = createCustomerValidator;

module.exports = {
  createCustomerValidator,
  updateCustomerValidator
};
