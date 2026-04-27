const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { getClientIp } = require('../utils/ip');
const { logAudit } = require('../utils/audit');

function getLastFichaje(empleadoId) {
  return db.prepare('SELECT * FROM fichajes WHERE empleado_id = ? ORDER BY fecha_hora DESC, id DESC LIMIT 1').get(empleadoId);
}

router.get('/empleados', (_req, res, next) => {
  try {
    const rows = db.prepare('SELECT id, nombre FROM empleados WHERE activo = 1 AND pin_hash IS NOT NULL ORDER BY nombre ASC').all();
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/fichar', (req, res, next) => {
  try {
    const { empleado_id, email, pin, tipo } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN requerido' });

    const empleado = empleado_id
      ? db.prepare('SELECT * FROM empleados WHERE id = ? AND activo = 1').get(Number(empleado_id))
      : db.prepare('SELECT * FROM empleados WHERE email = ? AND activo = 1').get(String(email || '').trim());

    if (!empleado || !empleado.pin_hash || !bcrypt.compareSync(String(pin), empleado.pin_hash)) {
      return res.status(401).json({ error: 'Empleado o PIN incorrecto' });
    }

    const ultimo = getLastFichaje(empleado.id);
    const nextTipo = ['entrada', 'salida'].includes(tipo) ? tipo : (ultimo?.tipo === 'entrada' ? 'salida' : 'entrada');

    if (nextTipo === 'entrada' && ultimo?.tipo === 'entrada') return res.status(409).json({ error: 'Ya hay una entrada abierta' });
    if (nextTipo === 'salida' && ultimo?.tipo !== 'entrada') return res.status(409).json({ error: 'No hay entrada abierta' });

    const info = db.prepare('INSERT INTO fichajes (empleado_id, tipo, ip, origen) VALUES (?, ?, ?, ?)')
      .run(empleado.id, nextTipo, getClientIp(req), 'kiosco');
    const fichaje = db.prepare('SELECT * FROM fichajes WHERE id = ?').get(info.lastInsertRowid);
    logAudit(empleado.id, 'kiosk_clock', 'fichajes', info.lastInsertRowid, { tipo: nextTipo });

    res.status(201).json({ ok: true, empleado: { id: empleado.id, nombre: empleado.nombre }, fichaje, estado: nextTipo === 'entrada' ? 'dentro' : 'fuera' });
  } catch (err) { next(err); }
});

module.exports = router;