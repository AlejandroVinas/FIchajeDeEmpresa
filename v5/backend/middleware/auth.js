const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

// Acepta el token desde:
// 1. Cookie httpOnly 'access_token'  → panel React
// 2. Header Authorization: Bearer … → app Flutter
module.exports = function authMiddleware(req, res, next) {
  // Intentar cookie primero
  let token = req.cookies?.access_token;

  // Si no hay cookie, intentar header Bearer
  if (!token) {
    const header = req.headers.authorization;
    if (header) token = header.split(' ')[1];
  }

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
