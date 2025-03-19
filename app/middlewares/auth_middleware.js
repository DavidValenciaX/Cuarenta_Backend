// app/middlewares/auth_middleware.js
const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response_util');
const { isTokenBlacklisted } = require('../utils/token_blacklist');

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return sendResponse(res, 403, 'error', 'Acceso denegado, token requerido');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return sendResponse(res, 401, 'error', 'Formato de token inválido');
  }

  const token = parts[1];

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
