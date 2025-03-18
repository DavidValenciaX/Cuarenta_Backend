const jwt = require('jsonwebtoken');
const { sendResponse } = require('../utils/response_util');

function verificarToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token){
    return sendResponse(res, 403, 'error', 'Acceso denegado, token requerido');
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
