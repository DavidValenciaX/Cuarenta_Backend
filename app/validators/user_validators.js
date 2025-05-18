const { check } = require('express-validator');
const { validateResult } = require('../utils/validate_util');

// Registration validator
const validateRegistration = [
  check('fullName')
    .notEmpty().withMessage('Nombre completo es requerido')
    .isLength({ min: 3 }).withMessage('Nombre completo debe tener al menos 3 caracteres'),
  
  check('companyName')
    .notEmpty().withMessage('Nombre de la empresa es requerido')
    .isLength({ min: 2 }).withMessage('Nombre de la empresa debe tener al menos 2 caracteres'),
  
  check('password')
    .notEmpty().withMessage('Contraseña es requerida')
    .isLength({ min: 8 }).withMessage('Contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Contraseña debe contener al menos una letra mayúscula, una minúscula y un número'),
  
  check('confirmPassword')
    .notEmpty().withMessage('Confirmación de contraseña es requerida')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),
  
  check('email')
    .notEmpty().withMessage('Correo electrónico es requerido')
    .isEmail().withMessage('Formato de correo electrónico inválido'),
  
  check('phone')
    .notEmpty().withMessage('Número telefónico es requerido')
    .matches(/^\d{10}$/).withMessage('Número telefónico debe tener 10 dígitos'),

  (req, res, next) => {
    validateResult(req, res, next);
  }
];

// Login validator
const validateLogin = [
  check('email')
    .notEmpty().withMessage('Correo electrónico es requerido')
    .isEmail().withMessage('Formato de correo electrónico inválido'),
  
  check('password')
    .notEmpty().withMessage('Contraseña es requerida'),

  (req, res, next) => {
    validateResult(req, res, next);
  }
];

// Email confirmation validator
const validateEmailConfirmation = [
  check('token')
    .notEmpty().withMessage('Token es requerido'),

  (req, res, next) => {
    validateResult(req, res, next);
  }
];

// Forgot password validator
const validateForgotPassword = [
  check('email')
    .notEmpty().withMessage('Correo electrónico es requerido')
    .isEmail().withMessage('Formato de correo electrónico inválido'),

  (req, res, next) => {
    validateResult(req, res, next);
  }
];

// Reset password validator
const validateResetPassword = [
  check('token')
    .notEmpty().withMessage('Token es requerido'),
  
  check('newPassword')
    .notEmpty().withMessage('Nueva contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Contraseña debe contener al menos una letra mayúscula, una minúscula y un número'),
  
  check('confirmNewPassword')
    .notEmpty().withMessage('Confirmación de contraseña es requerida')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),

  (req, res, next) => {
    validateResult(req, res, next);
  }
];

// Validator for updating user profile
const validateUpdateProfile = [
  check('fullName')
    .optional()
    .isLength({ min: 3 }).withMessage('Nombre completo debe tener al menos 3 caracteres'),

  check('companyName')
    .optional()
    .isLength({ min: 2 }).withMessage('Nombre de la empresa debe tener al menos 2 caracteres'),
  
  check('phone')
    .optional()
    .matches(/^\d{10}$/).withMessage('Número telefónico debe tener 10 dígitos'),

  (req, res, next) => {
    validateResult(req, res, next);
  }
];

module.exports = {
  validateRegistration,
  validateLogin,
  validateEmailConfirmation,
  validateForgotPassword,
  validateResetPassword,
  validateUpdateProfile
};
