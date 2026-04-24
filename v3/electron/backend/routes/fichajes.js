const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { getClientIp } = require('../utils/ip');

router.use(auth);

router.get('/', (req, res, next) => {
  try {
    let rows;

    if (req.usuario.role === 'admin') {
      rows = db.prepare(`
        SELECT
          f.id,
          f.empleado_id,
          e.nombre AS empleado_nombre,
          e.email  AS empleado_email,
          f.tipo,
          f.fecha_hora,
          f.lat,
          f.lon,
          f.ip,
          f.created_at
        FROM fichajes f
        JOIN empleados e ON e.id = f.empleado_id
        ORDER BY f.fecha_hora DESC, f.id DESC
      `).all();
    } else {
      rows = db.prepare(`
        SELECT
          f.id,
          f.empleado_id,
          e.nombre AS empleado_nombre,
          e.email  AS empleado_email,
          f.tipo,
          f.fecha_hora,
          f.lat,
          f.lon,
          f.ip,
          f.created_at
        FROM fichajes f
        JOIN empleados e ON e.id = f.empleado_id
        WHERE f.empleado_id = ?
        ORDER BY f.fecha_hora DESC, f.id DESC
      `).all(req.usuario.id);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { tipo, lat = null, lon = null } = req.body;

    if (!['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({ error: "tipo debe ser 'entrada' o 'salida'" });
    }

    const info = db.prepare(`
      INSERT INTO fichajes (empleado_id, tipo, lat, lon, ip)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.usuario.id, tipo, lat, lon, getClientIp(req));

    const fichaje = db.prepare(`
      SELECT *
      FROM fichajes
      WHERE id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json(fichaje);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
