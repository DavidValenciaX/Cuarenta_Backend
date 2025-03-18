// app/middlewares/auth_middleware.js
const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response_util');
const { isTokenBlacklisted } = require('../utils/token_blacklist');

function verificarToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return sendResponse(res, 403, 'error', 'Acceso denegado, token requerido');
  }

  // Comprobar si el token está en la Blacklist
  if (isTokenBlacklisted(token)) {
    return sendResponse(res, 401, 'error', 'Token inválido o cerrado (logout)');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    return sendResponse(res, 401, 'error', 'Token inválido');
  }
}

module.exports = { verificarToken };
