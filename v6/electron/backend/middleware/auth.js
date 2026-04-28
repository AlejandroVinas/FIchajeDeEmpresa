const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.SECRET_KEY ||
  'fichaje-v6-local-secret';

module.exports = function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token =
      header.startsWith('Bearer ')
        ? header.slice(7)
        : req.headers['x-auth-token'] || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    req.usuario = {
      id: Number(payload.id),
      email: payload.email,
      nombre: payload.nombre,
      role: payload.role || payload.rol || 'empleado',
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sesión no válida o caducada' });
  }
};

module.exports.JWT_SECRET = JWT_SECRET;