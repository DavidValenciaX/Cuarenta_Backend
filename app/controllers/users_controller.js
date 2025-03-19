const User = require('../models/users_model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { validateEmail, validatePhone } = require('../utils/validate_util');
const { sendResponse } = require('../utils/response_util');
const { generateToken } = require('../utils/generate_token');
const { addToBlacklist} = require('../utils/token_blacklist');

const jwt = require('jsonwebtoken'); 

const moment = require('moment-timezone');


//Funcion para crear usuario
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
    const usuarioExistente = await User.findByEmail(email);
    if (usuarioExistente) {
        return sendResponse(res, 400, 'error', 'El correo electrónico ya está registrado');
    }

    // Encriptar contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear token de confirmación
    const confirmationTokenHash = generateToken();
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


//Funcion para confirmar correo
async function confirmEmail(req, res) {
    try {
      const { token } = req.body;
      if (!token) {
        return sendResponse(res, 400, 'error', 'Token requerido para confirmar el correo');
      }
  
      const user = await User.findByConfirmationToken(token);
      if (!user) {
        return sendResponse(res, 404, 'error', 'Token inválido o usuario no encontrado');
      }
  
      const now = moment().tz('America/Bogota');
      if (moment(user.confirmation_token_expiration).isBefore(now)) {
        // Token vencido -> Generar uno nuevo + reenvío
        const newToken = generateToken();
        const newExpiration = moment().tz('America/Bogota').add(1, 'hour').format();
        await User.updateConfirmationToken(user.id, newToken, newExpiration);
  
        return sendResponse(res, 200, 'success', 'Token de verificación reenviado', {
          newToken,
          newExpiration
        });
      }
  
      // Si no está vencido, confirmar usuario -> status_id se pone en 'active'
      await User.confirmUser(user.id);
  
      return sendResponse(res, 200, 'success', 'Correo confirmado exitosamente');
    } catch (error) {
      console.error('Error in confirmEmail:', error);
      return sendResponse(res, 500, 'error', 'Ocurrió un error al confirmar el correo');
    }
  }
  

  //Funcion para iniciar sesion
  async function loginUser(req, res) {
    try {
      const { email, password } = req.body;

      // Verificar que email y password no estén vacíos
      if (!email || !password) {
        return sendResponse(res, 400, 'error', 'Email y password son requeridos');
      }
  
      // Buscar usuario por email (que incluya password_hash)
      const user = await User.findUserWithPasswordByEmail(email);
      if (!user) {
        return sendResponse(res, 401, 'error', 'Credenciales inválidas');
      }
  
      if (user.status === 'pending_confirmation' && user.category === 'user') {
        return sendResponse(res, 403, 'error', 'Cuenta pendiente por confirmar');
      }

      // Comparar password ingresada con el hash en DB
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return sendResponse(res, 401, 'error', 'Credenciales inválidas');
      }
  
      // Generar JWT con user ID 
      // Comentario en español: Se recomienda guardar la clave secreta en process.env.JWT_SECRET
      const token = jwt.sign(
        { userId: user.id }, 
        process.env.JWT_SECRET, 
        { expiresIn: '5h' } // El token expira en 5 hora
      );
  
      // Respuesta exitosa
      return sendResponse(res, 200, 'success', 'Inicio de sesión exitoso', { token });
    } catch (error) {
      console.error('Error in loginUser:', error);
      return sendResponse(res, 500, 'error', 'Error interno de servidor');
    }
    
}

//Cerrar sesion
async function logoutUser(req, res) {
    try {

      const token = req.headers['authorization'];
      if (!token) {
        return sendResponse(res, 400, 'error', 'Verificacion no aportada');
      }

      addToBlacklist(token);
  
      return sendResponse(res, 200, 'success', 'Cierre de sesion exitoso');
    } catch (error) {
      console.error('Error in logoutUser:', error);
      return sendResponse(res, 500, 'error', 'Error interno');
    }
  }

  //Generar y guardar token para recuperar contraseña
  async function forgotPassword(req, res) {
    try {
      const { email } = req.body;
      if (!email) {
        return sendResponse(res, 400, 'error', 'El correo es requerido');
      }
  
      // Buscar usuario por email
      const user = await User.findByEmail(email);
      if (!user) {
        return sendResponse(res, 404, 'error', 'Usuario no encontrado');
      }
  
      // Generar token y expiración 
      const resetTokenHash = generateToken();
      const resetTokenExpiration = moment().tz('America/Bogota').add(20, 'minute').format();
  
      // Guardar en DB
      await User.updateResetToken(user.id, resetTokenHash, resetTokenExpiration);
  
      // (Opcional) Enviar correo con el token al usuario.
      // sendEmail(user.email, resetTokenHash);
  
      return sendResponse(res, 200, 'success', 'Código de recuperacion enviado exitosamente', {
        resetTokenHash,
        resetTokenExpiration
      });
    } catch (error) {
      console.error('Error in forgotPassword:', error);
      return sendResponse(res, 500, 'error', 'Internal server error');
    }
  }

//Verificar token, nueva contraseña y actualizar
async function resetPassword(req, res) {
    try {
      const { token, newPassword, confirmNewPassword } = req.body;
  
      // Validaciones
      if (!token) {
        return sendResponse(res, 400, 'error', 'Verificacion no aportada');
      }
      if (!newPassword || !confirmNewPassword) {
        return sendResponse(res, 400, 'error', 'nueva contraseña y confirmacion requeridas');
      }
      if (newPassword !== confirmNewPassword) {
        return sendResponse(res, 400, 'error', 'Las contraseñas no coinciden');
      }
  
      // Buscar usuario por token
      const user = await User.findByResetToken(token);
      if (!user) {
        return sendResponse(res, 404, 'error', 'Token inválido o usuario no encontrado');
      }
  
      // Verificar expiración
      const now = moment().tz('America/Bogota');
      if (moment(user.password_reset_token_expiration).isBefore(now)) {
        return sendResponse(res, 400, 'error', 'Token expirado');
      }
  
      // Encriptar nueva contraseña
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
  
      // Actualizar contraseña y limpiar el token
      await User.updatePassword(user.id, newPasswordHash);
  
      return sendResponse(res, 200, 'success', 'Contraseña actualizada exitosamente');
    } catch (error) {
      console.error('Error in resetPassword:', error);
      return sendResponse(res, 500, 'error', 'Error interno');
    }
  }
  
  

module.exports = { createUser, confirmEmail, loginUser, logoutUser,forgotPassword,resetPassword };
