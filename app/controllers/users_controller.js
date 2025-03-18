const User = require('../models/users_model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validateEmail, validatePhone } = require('../utils/validate_util');
const { sendResponse } = require('../utils/response_util');

const moment = require('moment-timezone');

async function createUser(req, res) {
  try {
    const { fullName, companyName, password, confirmPassword, email, phone } = req.body;

    // Validaciones
    if (password !== confirmPassword) {
        return sendResponse(res, 400, 'error', 'Las contraseñas no coinciden');
    }
    if (!validateEmail(email)) {
        return sendResponse(res, 400, 'error', 'Correo electrónico no válido');
    }
    if (!validatePhone(phone)) {
        return sendResponse(res, 400, 'error', 'Número de teléfono no válido');
    }

    // Verificar si el correo ya está registrado
    const usuarioExistente = await User.buscarPorEmail(email);
    if (usuarioExistente) {
        return sendResponse(res, 400, 'error', 'El correo electrónico ya está registrado');
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear token de confirmación
    const confirmationTokenHash = crypto.randomBytes(32).toString('hex');
    const confirmationTokenExpiration = moment().tz('America/Bogota').add(1, 'hour').format();

    // Guardar en BD
    const newUser = await User.createUser({
      fullName, companyName, passwordHash, email, phone, confirmationTokenHash, confirmationTokenExpiration
    });

    return sendResponse(res, 201, 'success', 'Usuario creado exitosamente', {
        userId: newUser.id
      });
    } catch (error) {
      console.error('Error en crearUsuario:', error);
      return sendResponse(res, 500, 'error', 'Error al registrar usuario');
    }
}

module.exports = { createUser };
