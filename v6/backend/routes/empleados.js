const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

function isAdmin(req) { return req.usuario?.role === 'admin'; }
function isManager(req) { return ['admin', 'supervisor'].includes(req.usuario?.role); }
function requireAdmin(req, res, next) { if (!isAdmin(req)) return res.status(403).json({ error: 'Solo administradores' }); next(); }
function requireManager(req, res, next) { if (!isManager(req)) return res.status(403).json({ error: 'Solo administradores o supervisores' }); next(); }

function toNumberOrDefault(value, fallback) { const parsed = Number(value); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function cleanTime(value, fallback) { return typeof value === 'string' && /^\d{2}:\d{2}$/.test(value) ? value : fallback; }
function cleanRole(value, fallback = 'empleado') { return ['admin', 'supervisor', 'empleado'].includes(value) ? value : fallback; }
function cleanSupervisor(value) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }

function publicEmpleado(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    role: row.role,
    supervisor_id: row.supervisor_id || null,
    activo: row.activo !== 0,
    tiene_pin: Boolean(row.pin_hash),
    horas_jornada: row.horas_jornada,
    hora_entrada: row.hora_entrada,
    hora_salida: row.hora_salida,
    horas_semanales: row.horas_semanales,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function getEmpleadoById(id) {
  return db.prepare(`
    SELECT id, nombre, email, password_hash, role, supervisor_id, pin_hash, activo,
           horas_jornada, hora_entrada, hora_salida, horas_semanales, created_at, updated_at
    FROM empleados WHERE id = ?
  `).get(id);
}

router.use(auth);

router.get('/', requireManager, (req, res, next) => {
  try {
    let rows;
    if (req.usuario.role === 'supervisor') {
      rows = db.prepare(`
        SELECT id, nombre, email, role, supervisor_id, pin_hash, activo, horas_jornada,
               hora_entrada, hora_salida, horas_semanales, created_at, updated_at
        FROM empleados
        WHERE supervisor_id = ? OR id = ?
        ORDER BY activo DESC, nombre ASC
      `).all(req.usuario.id, req.usuario.id);
    } else {
      rows = db.prepare(`
        SELECT id, nombre, email, role, supervisor_id, pin_hash, activo, horas_jornada,
               hora_entrada, hora_salida, horas_semanales, created_at, updated_at
        FROM empleados
        ORDER BY activo DESC, id DESC
      `).all();
    }
    res.json(rows.map(publicEmpleado));
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, (req, res, next) => {
  try {
    const { nombre, email, password, role = 'empleado', horas_jornada, hora_entrada, hora_salida, horas_semanales, supervisor_id, pin } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'nombre, email y password son obligatorios' });

    const clean = {
      nombre: String(nombre).trim(),
      email: String(email).trim(),
      password_hash: bcrypt.hashSync(String(password), 10),
      role: cleanRole(role),
      supervisor_id: cleanSupervisor(supervisor_id),
      pin_hash: pin ? bcrypt.hashSync(String(pin), 10) : null,
      horas_jornada: toNumberOrDefault(horas_jornada, 8),
      hora_entrada: cleanTime(hora_entrada, '09:00'),
      hora_salida: cleanTime(hora_salida, '17:00'),
      horas_semanales: toNumberOrDefault(horas_semanales, 40),
    };

    const info = db.prepare(`
      INSERT INTO empleados (nombre, email, password_hash, role, supervisor_id, pin_hash, horas_jornada, hora_entrada, hora_salida, horas_semanales)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(clean.nombre, clean.email, clean.password_hash, clean.role, clean.supervisor_id, clean.pin_hash, clean.horas_jornada, clean.hora_entrada, clean.hora_salida, clean.horas_semanales);

    logAudit(req.usuario.id, 'created', 'empleados', info.lastInsertRowid, { email: clean.email, role: clean.role });
    res.status(201).json(publicEmpleado(getEmpleadoById(info.lastInsertRowid)));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Ya existe un empleado con ese email' });
    next(err);
  }
});

router.put('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const current = getEmpleadoById(id);
    if (!current) return res.status(404).json({ error: 'Empleado no encontrado' });

    const nombre = String(req.body.nombre || current.nombre).trim();
    const email = String(req.body.email || current.email).trim();
    const role = cleanRole(req.body.role, current.role);
    const supervisor_id = req.body.supervisor_id === undefined ? (current.supervisor_id || null) : cleanSupervisor(req.body.supervisor_id);
    const activo = req.body.activo === undefined ? current.activo : (req.body.activo ? 1 : 0);
    const jornada = toNumberOrDefault(req.body.horas_jornada, current.horas_jornada || 8);
    const semanales = toNumberOrDefault(req.body.horas_semanales, current.horas_semanales || 40);
    const entrada = cleanTime(req.body.hora_entrada, current.hora_entrada || '09:00');
    const salida = cleanTime(req.body.hora_salida, current.hora_salida || '17:00');

    let passwordHash = current.password_hash;
    if (req.body.password && String(req.body.password).trim()) passwordHash = bcrypt.hashSync(String(req.body.password), 10);

    let pinHash = current.pin_hash;
    if (req.body.pin !== undefined) {
      pinHash = String(req.body.pin || '').trim() ? bcrypt.hashSync(String(req.body.pin), 10) : null;
    }

    db.prepare(`
      UPDATE empleados
      SET nombre = ?, email = ?, password_hash = ?, role = ?, supervisor_id = ?, pin_hash = ?, activo = ?,
          horas_jornada = ?, hora_entrada = ?, hora_salida = ?, horas_semanales = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(nombre, email, passwordHash, role, supervisor_id, pinHash, activo, jornada, entrada, salida, semanales, id);

    logAudit(req.usuario.id, 'updated', 'empleados', id, { email, role, supervisor_id, activo });
    res.json(publicEmpleado(getEmpleadoById(id)));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) return res.status(409).json({ error: 'Ya existe un empleado con ese email' });
    next(err);
  }
});

router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (id === req.usuario.id) return res.status(400).json({ error: 'No puedes eliminar tu propio usuario administrador mientras estas conectado' });
    const info = db.prepare('DELETE FROM empleados WHERE id = ?').run(id);
    if (!info.changes) return res.status(404).json({ error: 'Empleado no encontrado' });
    logAudit(req.usuario.id, 'deleted', 'empleados', id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;