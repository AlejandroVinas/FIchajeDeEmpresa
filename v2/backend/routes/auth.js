const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const db        = require('../db');
const logger    = require('../utils/logger');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config');

// ── Constantes ────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_TTL  = '15m';   // Token de acceso de corta duración
const REFRESH_TOKEN_TTL = '7d';    // Refresh token de larga duración

// ── Rate limiting — máximo 10 intentos cada 15 minutos por IP ─────────────────
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { error: 'Demasiados intentos. Espera 15 minutos.' },
  // keyGenerator por defecto usa req.ip, que respeta trust proxy si está activo
});

// ── Opciones de cookie compartidas ───────────────────────────────────────────
function cookieOpts(maxAgeMs) {
  return {
    httpOnly:  true,
    sameSite:  'strict',
    secure:    process.env.NODE_ENV === 'production', // solo HTTPS en producción
    maxAge:    maxAgeMs,
  };
}

// ── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', loginLimiter, (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email y contraseña requeridos' });

    const empleado = db.prepare('SELECT * FROM empleados WHERE email = ?').get(email);
    if (!empleado || !bcrypt.compareSync(password, empleado.password_hash)) {
      logger.warn({ email }, 'Intento de login fallido');
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const payload = { id: empleado.id, email: empleado.email, role: empleado.role };

    // Access token — corta duración, se renueva automáticamente con /auth/refresh
    const accessToken  = jwt.sign(payload, JWT_SECRET,         { expiresIn: ACCESS_TOKEN_TTL });
    // Refresh token — larga duración, solo para emitir nuevos access tokens
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

    // La app Flutter sigue recibiendo el token en el body (no usa cookies)
    // El panel React recibe los tokens en cookies httpOnly
    res
      .cookie('access_token',  accessToken,  cookieOpts(15 * 60 * 1000))
      .cookie('refresh_token', refreshToken, cookieOpts(7 * 24 * 60 * 60 * 1000))
      .json({
        // Flutter necesita el token en el body para guardarlo en secure_storage
        token:  accessToken,
        nombre: empleado.nombre,
        role:   empleado.role,
      });

    logger.info({ empleadoId: empleado.id }, 'Login correcto');
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/refresh ────────────────────────────────────────────────────────
// El panel React llama a este endpoint cuando el access token caduca.
// Envía automáticamente la cookie refresh_token.
router.post('/refresh', (req, res, next) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ error: 'Refresh token no encontrado' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Refresh token inválido o expirado' });
    }

    // Verificar que el empleado aún existe en la BD
    const empleado = db.prepare('SELECT id, email, role FROM empleados WHERE id = ?')
      .get(payload.id);
    if (!empleado) return res.status(401).json({ error: 'Empleado no encontrado' });

    const newPayload     = { id: empleado.id, email: empleado.email, role: empleado.role };
    const newAccessToken = jwt.sign(newPayload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

    res
      .cookie('access_token', newAccessToken, cookieOpts(15 * 60 * 1000))
      .json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res
    .clearCookie('access_token',  { httpOnly: true, sameSite: 'strict' })
    .clearCookie('refresh_token', { httpOnly: true, sameSite: 'strict' })
    .json({ ok: true });
});

module.exports = router;
