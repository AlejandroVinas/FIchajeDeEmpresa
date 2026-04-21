const { EMPRESA_IPS } = require('../config');

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress?.replace('::ffff:', '') || '';
}

function ipEnEmpresa(req) {
  const ip = getClientIp(req);
  return EMPRESA_IPS.includes(ip);
}

module.exports = { getClientIp, ipEnEmpresa };
