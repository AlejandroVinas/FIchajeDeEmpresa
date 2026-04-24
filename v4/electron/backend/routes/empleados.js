const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');

function requireAdmin(req, res, next) {
  if (req.usuario?.role !== 'admin') {
    return res.status(403).json({ error: 'Solo administradores' });
  }
  next();
}

function toNumberOrDefault(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

router.use(auth);

router.get('/', requireAdmin, (_req, res, next) => {
  try {
    const rows = db.prepare(`
      SELECT
        id,
        nombre,
        email,
        role,
        horas_jornada,
        hora_entrada,
        hora_salida,
        horas_semanales,
        created_at
      FROM empleados
      ORDER BY id DESC
    `).all();

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAdmin, (req, res, next) => {
  try {
    const {
      nombre,
      email,
      password,
      role = 'empleado',
      horas_jornada,
      hora_entrada,
      hora_salida,
      horas_semanales,
    } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son obligatorios' });
    }

    if (!['admin', 'empleado'].includes(role)) {
      return res.status(400).json({ error: "role debe ser 'admin' o 'empleado'" });
    }

    const jornada = toNumberOrDefault(horas_jornada, 8);
    const semanales = toNumberOrDefault(horas_semanales, 40);
    const entrada = cleanTime(hora_entrada, '09:00');
    const salida = cleanTime(hora_salida, '17:00');

    const password_hash = bcrypt.hashSync(password, 10);

    const info = db.prepare(`
      INSERT INTO empleados (
        nombre,
        email,
        password_hash,
        role,
        horas_jornada,
        hora_entrada,
        hora_salida,
        horas_semanales
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nombre, email, password_hash, role, jornada, entrada, salida, semanales);

    const empleado = db.prepare(`
      SELECT
        id,
        nombre,
        email,
        role,
        horas_jornada,
        hora_entrada,
        hora_salida,
        horas_semanales,
        created_at
      FROM empleados
      WHERE id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(empleado);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un empleado con ese email' });
    }
    next(err);
  }
});

module.exports = router;
