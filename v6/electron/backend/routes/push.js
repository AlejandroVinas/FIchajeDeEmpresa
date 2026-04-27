const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.get('/vapid-public-key', (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

router.post('/subscribe', auth, (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    const p256dh = req.body?.keys?.p256dh;
    const authKey = req.body?.keys?.auth;

    if (!endpoint || !p256dh || !authKey) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }

    db.prepare(`
      INSERT INTO push_subscriptions (empleado_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        empleado_id = excluded.empleado_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth
    `).run(req.usuario.id, endpoint, p256dh, authKey);

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
