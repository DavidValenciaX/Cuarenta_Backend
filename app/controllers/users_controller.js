const User = require('../models/users_model');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { sendResponse } = require('../utils/response_util');
const { generateToken } = require('../utils/generate_token');
const { addToBlacklist} = require('../utils/token_blacklist');
const { sendEmail } = require('../utils/email_util');
const { getConfirmationEmailTemplate, getRecoveryEmailTemplate } = require('../utils/email_templates');

const jwt = require('jsonwebtoken'); 
const moment = require('moment-timezone');

//Funcion para crear usuario
async function createUser(req, res) {
  try {
    const { fullName, companyName, password, email, phone } = req.body;

    // Verificar si el correo ya está registrado
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
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

    await sendEmail(
      email,
      'Confirma tu cuenta ',
      getConfirmationEmailTemplate(fullName, confirmationTokenHash)
    );
    
    return sendResponse(res, 201, 'success', 'Usuario creado, código de confirmación enviado al correo', {
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
      
      const user = await User.findByConfirmationToken(token);
      if (!user) {
        return sendResponse(res, 404, 'error', 'Token inválido o usuario no encontrado');
      }
  
      const now = moment().tz('America/Bogota');
      if (moment(user.confirmationTokenExpiration).isBefore(now)) {
        // Token vencido -> Generar uno nuevo  reenvío
        const newToken = generateToken();
        const newExpiration = moment().tz('America/Bogota').add(1, 'hour').format();
        await User.updateConfirmationToken(user.id, newToken, newExpiration);
  
        return sendResponse(res, 200, 'success', 'Token de verificación reenviado', {
          newToken,
          newExpiration
        });
      }
  
      // Si no está vencido, confirmar usuario -> statusId se pone en 'active'
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
  
      // Buscar usuario por email (que incluya passwordHash)
      const user = await User.findUserWithPasswordByEmail(email);
      if (!user) {
        return sendResponse(res, 401, 'error', 'Credenciales inválidas');
      }
  
      if (user.status === 'pending' && user.category === 'user') {
        // Generate new token for unconfirmed user
        const newToken = generateToken();
        const newExpiration = moment().tz('America/Bogota').add(1, 'hour').format();
        
        // Update confirmation token in database
        await User.updateConfirmationToken(user.id, newToken, newExpiration);
        
        // Get user's full details to send email
        const userDetails = await User.findById(user.id);
        
        // Send confirmation email with new token
        await sendEmail(
          email,
          'Confirma tu cuenta',
          getConfirmationEmailTemplate(userDetails.full_name || email, newToken)
        );
        
        return sendResponse(res, 403, 'error', 'Cuenta pendiente por confirmar. Se ha enviado un nuevo código de confirmación a tu correo', {
          newToken,
          newExpiration
        });
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
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return sendResponse(res, 400, 'error', 'Verificacion no aportada');
      }
      
      // Extract the token from the Authorization header
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      
      try {
        // Decode the token to get user ID and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        
        // Calculate expiration date from JWT
        const expiresAt = new Date(decoded.exp * 1000); // Convert from seconds to milliseconds
        
        // Add to blacklist with user ID and expiration
        await addToBlacklist(token, userId, expiresAt);
        
        return sendResponse(res, 200, 'success', 'Cierre de sesion exitoso');
      } catch (jwtError) {
        console.error('Invalid token:', jwtError);
        return sendResponse(res, 401, 'error', 'Token inválido');
      }
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
  
      await sendEmail(
        email,
        'Recupera tu contraseña',
        getRecoveryEmailTemplate(user.fullName || email, resetTokenHash)
      );
      
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
      
      // --- Add Logging Here ---
      console.log('Stored Expiration (Raw):', user.password_reset_token_expiration);
      console.log('Stored Expiration (Moment Parsed):', moment(user.password_reset_token_expiration).format());
      const now = moment().tz('America/Bogota');
      console.log('Current Time (Bogota):', now.format());
      // --- End Logging ---
  
      // Verificar expiración
      if (moment(user.password_reset_token_expiration).isBefore(now)) {
        console.log('Expiration check failed: Stored time is BEFORE current time.'); // Add this log
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
  
//Obtener perfil de usuario
async function getUserProfile(req, res) {
  try {
    const userId = req.usuario.userId;
    const user = await User.findById(userId);
    
    if (!user) {
      return sendResponse(res, 404, 'error', 'Usuario no encontrado');
    }
    
    return sendResponse(res, 200, 'success', 'Perfil de usuario obtenido con éxito', user);
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return sendResponse(res, 500, 'error', 'Error interno del servidor');
  }
}

module.exports = { createUser, confirmEmail, loginUser, logoutUser, forgotPassword, resetPassword, getUserProfile };
