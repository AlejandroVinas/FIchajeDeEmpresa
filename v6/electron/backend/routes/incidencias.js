const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

let audit = null;
try {
  audit = require('../utils/audit');
} catch (_) {
  audit = null;
}

router.use(auth);

function logAuditSafe(usuarioId, accion, tabla, registroId, datos) {
  try {
    if (audit && typeof audit.logAudit === 'function') {
      audit.logAudit(usuarioId, accion, tabla, registroId, datos);
    }
  } catch (_) {}
}

function isManager(req) {
  return ['admin', 'supervisor'].includes(req.usuario?.role);
}

function normalizeEstado(value) {
  const raw = String(value || '').trim().toLowerCase();

  if (['aprobada', 'aprobado', 'aprobar', 'approve', 'approved'].includes(raw)) {
    return 'aprobada';
  }

  if (['rechazada', 'rechazado', 'rechazar', 'reject', 'rejected'].includes(raw)) {
    return 'rechazada';
  }

  return null;
}

function getIncidencia(id) {
  return db.prepare(`
    SELECT
      i.*,
      e.nombre AS empleado_nombre,
      e.email AS empleado_email,
      a.nombre AS admin_nombre
    FROM incidencias i
    JOIN empleados e ON e.id = i.empleado_id
    LEFT JOIN empleados a ON a.id = i.admin_id
    WHERE i.id = ?
  `).get(Number(id));
}

router.get('/', (req, res, next) => {
  try {
    let rows;

    const base = `
      SELECT
        i.*,
        e.nombre AS empleado_nombre,
        e.email AS empleado_email,
        a.nombre AS admin_nombre
      FROM incidencias i
      JOIN empleados e ON e.id = i.empleado_id
      LEFT JOIN empleados a ON a.id = i.admin_id
    `;

    if (req.usuario.role === 'admin') {
      rows = db.prepare(`${base} ORDER BY i.created_at DESC`).all();
    } else if (req.usuario.role === 'supervisor') {
      rows = db.prepare(`
        ${base}
        WHERE e.supervisor_id = ? OR e.id = ?
        ORDER BY i.created_at DESC
      `).all(req.usuario.id, req.usuario.id);
    } else {
      rows = db.prepare(`
        ${base}
        WHERE i.empleado_id = ?
        ORDER BY i.created_at DESC
      `).all(req.usuario.id);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const empleadoId = req.body.empleado_id ? Number(req.body.empleado_id) : Number(req.usuario.id);
    const tipo = req.body.tipo || 'otro';
    const fechaInicio = req.body.fecha_inicio || new Date().toISOString().slice(0, 10);
    const fechaFin = req.body.fecha_fin || null;
    const descripcion = String(req.body.descripcion || '').trim();

    if (!descripcion) {
      return res.status(400).json({ error: 'La descripcion es obligatoria' });
    }

    const info = db.prepare(`
      INSERT INTO incidencias (
        empleado_id,
        tipo,
        estado,
        fecha_inicio,
        fecha_fin,
        descripcion
      )
      VALUES (?, ?, 'pendiente', ?, ?, ?)
    `).run(empleadoId, tipo, fechaInicio, fechaFin, descripcion);

    logAuditSafe(req.usuario.id, 'created', 'incidencias', info.lastInsertRowid, {
      empleado_id: empleadoId,
      tipo,
    });

    res.status(201).json(getIncidencia(info.lastInsertRowid));
  } catch (err) {
    next(err);
  }
});

function resolver(req, res, next) {
  try {
    if (!isManager(req)) {
      return res.status(403).json({ error: 'Solo admin o supervisor pueden resolver incidencias' });
    }

    const id = Number(req.params.id);
    const incidencia = db.prepare('SELECT * FROM incidencias WHERE id = ?').get(id);

    if (!incidencia) {
      return res.status(404).json({ error: 'Incidencia no encontrada' });
    }

    const estado = normalizeEstado(req.body.estado);

    if (!estado) {
      return res.status(400).json({ error: 'Estado no valido' });
    }

    const respuesta = String(req.body.respuesta || '').trim();

    db.prepare(`
      UPDATE incidencias
      SET estado = ?,
          respuesta = ?,
          admin_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(estado, respuesta, req.usuario.id, id);

    logAuditSafe(req.usuario.id, 'resolved', 'incidencias', id, {
      estado,
      respuesta,
    });

    res.json(getIncidencia(id));
  } catch (err) {
    next(err);
  }
}

router.patch('/:id', resolver);
router.post('/:id/resolver', resolver);

module.exports = router;