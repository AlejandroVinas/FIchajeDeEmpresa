const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

router.use(auth);

function isManager(req) { return ['admin', 'supervisor'].includes(req.usuario?.role); }
function canSeeEmployee(req, empleadoId) {
  if (req.usuario.role === 'admin') return true;
  if (req.usuario.role === 'supervisor') {
    const row = db.prepare('SELECT id FROM empleados WHERE id = ? AND (supervisor_id = ? OR id = ?)').get(empleadoId, req.usuario.id, req.usuario.id);
    return Boolean(row);
  }
  return empleadoId === req.usuario.id;
}

const TIPOS = new Set(['olvido_fichaje', 'correccion', 'ausencia', 'baja_medica', 'vacaciones', 'permiso', 'retraso', 'otro']);
const ESTADOS = new Set(['pendiente', 'aprobada', 'rechazada']);

router.get('/', (req, res, next) => {
  try {
    let rows;
    const select = `
      SELECT i.*, e.nombre AS empleado_nombre, e.email AS empleado_email, a.nombre AS admin_nombre
      FROM incidencias i
      JOIN empleados e ON e.id = i.empleado_id
      LEFT JOIN empleados a ON a.id = i.admin_id
    `;

    if (req.usuario.role === 'admin') rows = db.prepare(`${select} ORDER BY i.created_at DESC`).all();
    else if (req.usuario.role === 'supervisor') rows = db.prepare(`${select} WHERE e.supervisor_id = ? OR e.id = ? ORDER BY i.created_at DESC`).all(req.usuario.id, req.usuario.id);
    else rows = db.prepare(`${select} WHERE i.empleado_id = ? ORDER BY i.created_at DESC`).all(req.usuario.id);

    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const empleadoId = isManager(req) && req.body.empleado_id ? Number(req.body.empleado_id) : req.usuario.id;
    const tipo = TIPOS.has(req.body.tipo) ? req.body.tipo : 'otro';
    const fechaInicio = req.body.fecha_inicio || new Date().toISOString().slice(0, 10);
    const fechaFin = req.body.fecha_fin || null;
    const descripcion = String(req.body.descripcion || '').trim();

    if (!canSeeEmployee(req, empleadoId)) return res.status(403).json({ error: 'No puedes crear incidencias para este empleado' });
    if (!descripcion) return res.status(400).json({ error: 'La descripcion es obligatoria' });

    const info = db.prepare(`
      INSERT INTO incidencias (empleado_id, tipo, fecha_inicio, fecha_fin, descripcion)
      VALUES (?, ?, ?, ?, ?)
    `).run(empleadoId, tipo, fechaInicio, fechaFin, descripcion);

    logAudit(req.usuario.id, 'created', 'incidencias', info.lastInsertRowid, { empleado_id: empleadoId, tipo });
    res.status(201).json(db.prepare('SELECT * FROM incidencias WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) { next(err); }
});

router.patch('/:id', (req, res, next) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: 'Solo administradores o supervisores' });
    const id = Number(req.params.id);
    const current = db.prepare('SELECT * FROM incidencias WHERE id = ?').get(id);
    if (!current) return res.status(404).json({ error: 'Incidencia no encontrada' });
    if (!canSeeEmployee(req, current.empleado_id)) return res.status(403).json({ error: 'No puedes resolver esta incidencia' });

    const estado = ESTADOS.has(req.body.estado) ? req.body.estado : current.estado;
    const respuesta = req.body.respuesta === undefined ? current.respuesta : String(req.body.respuesta || '').trim();

    db.prepare(`
      UPDATE incidencias
      SET estado = ?, respuesta = ?, admin_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(estado, respuesta, req.usuario.id, id);

    logAudit(req.usuario.id, 'resolved', 'incidencias', id, { estado });
    res.json(db.prepare('SELECT * FROM incidencias WHERE id = ?').get(id));
  } catch (err) { next(err); }
});

module.exports = router;