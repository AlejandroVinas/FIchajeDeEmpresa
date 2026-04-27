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

function cleanRole(value, fallback = 'empleado') {
  return ['admin', 'empleado'].includes(value) ? value : fallback;
}

function publicEmpleado(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    role: row.role,
    horas_jornada: row.horas_jornada,
    hora_entrada: row.hora_entrada,
    hora_salida: row.hora_salida,
    horas_semanales: row.horas_semanales,
    created_at: row.created_at,
  };
}

function getEmpleadoById(id) {
  return db.prepare(`
    SELECT
      id,
      nombre,
      email,
      password_hash,
      role,
      horas_jornada,
      hora_entrada,
      hora_salida,
      horas_semanales,
      created_at
    FROM empleados
    WHERE id = ?
  `).get(id);
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

    res.status(201).json(publicEmpleado(getEmpleadoById(info.lastInsertRowid)));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un empleado con ese email' });
    }
    next(err);
  }
});

router.put('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de empleado no valido' });
    }

    const current = getEmpleadoById(id);
    if (!current) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    const nombre = String(req.body.nombre || current.nombre).trim();
    const email = String(req.body.email || current.email).trim();
    const role = cleanRole(req.body.role, current.role);
    const jornada = toNumberOrDefault(req.body.horas_jornada, current.horas_jornada || 8);
    const semanales = toNumberOrDefault(req.body.horas_semanales, current.horas_semanales || 40);
    const entrada = cleanTime(req.body.hora_entrada, current.hora_entrada || '09:00');
    const salida = cleanTime(req.body.hora_salida, current.hora_salida || '17:00');

    if (!nombre || !email) {
      return res.status(400).json({ error: 'nombre y email son obligatorios' });
    }

    let passwordHash = current.password_hash;
    if (req.body.password && String(req.body.password).trim().length > 0) {
      passwordHash = bcrypt.hashSync(String(req.body.password), 10);
    }

    db.prepare(`
      UPDATE empleados
      SET
        nombre = ?,
        email = ?,
        password_hash = ?,
        role = ?,
        horas_jornada = ?,
        hora_entrada = ?,
        hora_salida = ?,
        horas_semanales = ?
      WHERE id = ?
    `).run(nombre, email, passwordHash, role, jornada, entrada, salida, semanales, id);

    res.json(publicEmpleado(getEmpleadoById(id)));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'Ya existe un empleado con ese email' });
    }
    next(err);
  }
});

router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID de empleado no valido' });
    }

    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario administrador mientras estas conectado' });
    }

    const info = db.prepare('DELETE FROM empleados WHERE id = ?').run(id);
    if (!info.changes) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
