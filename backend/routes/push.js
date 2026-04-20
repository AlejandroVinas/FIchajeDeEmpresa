const router    = require('express').Router();
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');

// GET /push/vapid-public-key
router.get('/vapid-public-key', adminAuth, (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /push/suscribir
router.post('/suscribir', adminAuth, (req, res) => {
  const sub = req.body;

  if (!sub?.endpoint)
    return res.status(400).json({ error: 'Suscripción inválida' });

  const existente = db.prepare(
    "SELECT id FROM push_suscripciones WHERE datos LIKE ?"
  ).get(`%${sub.endpoint}%`);

  if (existente) {
    db.prepare('UPDATE push_suscripciones SET datos = ? WHERE id = ?')
      .run(JSON.stringify(sub), existente.id);
    return res.json({ ok: true, accion: 'actualizada' });
  }

  db.prepare(
    'INSERT INTO push_suscripciones (datos, creado_en) VALUES (?, ?)'
  ).run(JSON.stringify(sub), new Date().toISOString());

  res.status(201).json({ ok: true, accion: 'registrada' });
});

// DELETE /push/suscribir
router.delete('/suscribir', adminAuth, (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint)
    return res.status(400).json({ error: 'endpoint requerido' });

  db.prepare(
    "DELETE FROM push_suscripciones WHERE datos LIKE ?"
  ).run(`%${endpoint}%`);

  res.json({ ok: true });
});

module.exports = router;
