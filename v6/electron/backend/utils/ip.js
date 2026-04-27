const { EMPRESA_IPS } = require('../config');

// req.ip ya tiene en cuenta el trust proxy configurado en server.js.
// Si trust proxy está activo, Express resuelve la IP real del cliente
// a partir de X-Forwarded-For del primer proxy de confianza.
// Si NO está activo, req.ip es siempre la IP directa del socket.
function getClientIp(req) {
  return req.ip?.replace('::ffff:', '') || '';
}

function ipEnEmpresa(req) {
  const ip = getClientIp(req);
  return EMPRESA_IPS.includes(ip);
}

module.exports = { getClientIp, ipEnEmpresa };
