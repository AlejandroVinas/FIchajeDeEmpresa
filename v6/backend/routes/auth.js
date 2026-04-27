const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db = require('../db');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');
const { logAudit } = require('../utils/audit');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
});

function cookieOpts(maxAgeMs) {
  return { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: maxAgeMs };
}

function publicUser(empleado) {
  return {
    id: empleado.id,
    nombre: empleado.nombre,
    email: empleado.email,
    role: empleado.role,
    supervisor_id: empleado.supervisor_id || null,
    activo: empleado.activo !== 0,
  };
}

function signTokens(empleado) {
  const payload = { id: empleado.id, email: empleado.email, role: empleado.role };
  return {
    accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL }),
    refreshToken: jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL }),
  };
}

router.post('/login', loginLimiter, (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseÃ±a requeridos' });

    const empleado = db.prepare('SELECT * FROM empleados WHERE email = ? AND activo = 1').get(email);
    if (!empleado || !bcrypt.compareSync(password, empleado.password_hash)) {
      logger.warn({ email }, 'Intento de login fallido');
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const { accessToken, refreshToken } = signTokens(empleado);
    logAudit(empleado.id, 'login', 'auth', empleado.id, { email: empleado.email });

    res
      .cookie('access_token', accessToken, cookieOpts(15 * 60 * 1000))
      .cookie('refresh_token', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000))
      .json({ token: accessToken, ...publicUser(empleado) });
  } catch (err) { next(err); }
});

router.post('/refresh', (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'Refresh token no encontrado' });

    let payload;
    try { payload = jwt.verify(token, JWT_REFRESH_SECRET); }
    catch { return res.status(401).json({ error: 'Refresh token invalido o expirado' }); }

    const empleado = db.prepare('SELECT * FROM empleados WHERE id = ? AND activo = 1').get(payload.id);
    if (!empleado) return res.status(401).json({ error: 'Empleado no encontrado' });

    const { accessToken } = signTokens(empleado);
    res.cookie('access_token', accessToken, cookieOpts(15 * 60 * 1000)).json({ ok: true });
  } catch (err) { next(err); }
});

router.get('/me', auth, (req, res, next) => {
  try {
    const empleado = db.prepare('SELECT * FROM empleados WHERE id = ?').get(req.usuario.id);
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(publicUser(empleado));
  } catch (err) { next(err); }
});

router.post('/cambiar-password', auth, (req, res, next) => {
  try {
    const { actual, nueva } = req.body;
    if (!actual || !nueva || String(nueva).length < 6) {
      return res.status(400).json({ error: 'Indica la contraseÃ±a actual y una nueva de al menos 6 caracteres' });
    }

    const empleado = db.prepare('SELECT * FROM empleados WHERE id = ?').get(req.usuario.id);
    if (!empleado || !bcrypt.compareSync(actual, empleado.password_hash)) {
      return res.status(401).json({ error: 'La contraseÃ±a actual no es correcta' });
    }

    const hash = bcrypt.hashSync(String(nueva), 10);
    db.prepare('UPDATE empleados SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hash, req.usuario.id);
    logAudit(req.usuario.id, 'password_changed', 'empleados', req.usuario.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

router.post('/logout', (req, res) => {
  res
    .clearCookie('access_token', { httpOnly: true, sameSite: 'strict' })
    .clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' })
    .json({ ok: true });
});

module.exports = router;