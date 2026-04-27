const logger = require('../utils/logger');

// Debe registrarse DESPUÉS de todas las rutas en server.js
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  logger.error({
    err,
    method:  req.method,
    url:     req.url,
    status,
    usuario: req.usuario?.id ?? null,
  }, err.message);

  // En producción nunca exponer el stack trace al cliente
  res.status(status).json({
    error: status < 500 ? err.message : 'Error interno del servidor',
  });
};
