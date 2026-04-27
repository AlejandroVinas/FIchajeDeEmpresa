const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

router.use(auth);

function isManager(req) { return ['admin', 'supervisor'].includes(req.usuario?.role); }
function requireAdmin(req, res, next) { if (req.usuario?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' }); next(); }

router.get('/', (req, res, next) => {
  try {
    if (!isManager(req)) return res.status(403).json({ error: 'Solo administradores o supervisores' });
    const rows = db.prepare('SELECT * FROM calendario_laboral ORDER BY fecha ASC').all();
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, (req, res, next) => {
  try {
    const fecha = String(req.body.fecha || '').slice(0, 10);
    const tipo = ['laborable', 'festivo', 'vacaciones', 'especial'].includes(req.body.tipo) ? req.body.tipo : 'laborable';
    const descripcion = String(req.body.descripcion || '').trim();
    const horas = req.body.horas_objetivo === '' || req.body.horas_objetivo === undefined ? null : Number(req.body.horas_objetivo);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return res.status(400).json({ error: 'Fecha no valida' });

    db.prepare(`
      INSERT INTO calendario_laboral (fecha, tipo, descripcion, horas_objetivo)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(fecha) DO UPDATE SET tipo = excluded.tipo, descripcion = excluded.descripcion, horas_objetivo = excluded.horas_objetivo, updated_at = CURRENT_TIMESTAMP
    `).run(fecha, tipo, descripcion, Number.isFinite(horas) ? horas : null);

    const row = db.prepare('SELECT * FROM calendario_laboral WHERE fecha = ?').get(fecha);
    logAudit(req.usuario.id, 'upserted', 'calendario_laboral', row.id, { fecha, tipo });
    res.status(201).json(row);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAdmin, (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const info = db.prepare('DELETE FROM calendario_laboral WHERE id = ?').run(id);
    if (!info.changes) return res.status(404).json({ error: 'Dia no encontrado' });
    logAudit(req.usuario.id, 'deleted', 'calendario_laboral', id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;