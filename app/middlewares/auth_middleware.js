// app/middlewares/auth_middleware.js
const jwt = require('jsonwebtoken');
const { isTokenBlacklisted } = require('../utils/token_blacklist');
const { sendResponse } = require('../utils/response_util');

async function verificarToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return sendResponse(res, 401, 'error', 'No se proporcionó un token');
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    
    // Check if token is blacklisted
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return sendResponse(res, 401, 'error', 'El token ha sido revocado');
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = { userId: decoded.userId };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendResponse(res, 401, 'error', 'El token ha expirado');
    }
    return sendResponse(res, 401, 'error', 'Token inválido');
  }
}

module.exports = { verificarToken };
