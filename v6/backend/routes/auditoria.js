const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    if (req.usuario?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
    const rows = db.prepare(`
      SELECT a.*, e.nombre AS actor_nombre, e.email AS actor_email
      FROM audit_log a
      LEFT JOIN empleados e ON e.id = a.actor_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 300
    `).all();
    res.json(rows.map((row) => ({ ...row, details: safeJson(row.details) })));
  } catch (err) { next(err); }
});

function safeJson(value) { try { return value ? JSON.parse(value) : {}; } catch { return {}; } }

module.exports = router;