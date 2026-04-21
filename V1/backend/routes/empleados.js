const router    = require('express').Router();
const bcrypt    = require('bcryptjs');
const db        = require('../db');
const adminAuth = require('../middleware/adminAuth');

// POST /empleados — crear empleado
router.post('/', adminAuth, (req, res) => {
  const { nombre, email, password, role = 'empleado', clave_publica = null } = req.body;

  if (!nombre || !email || !password)
    return res.status(400).json({ error: 'nombre, email y password son requeridos' });

  if (clave_publica !== null) {
    try {
      const raw = Buffer.from(clave_publica, 'base64');
      if (raw.length !== 32)
        return res.status(400).json({ error: 'clave_publica debe ser 32 bytes Ed25519 en base64' });
    } catch {
      return res.status(400).json({ error: 'clave_publica no es base64 válido' });
    }
  }

  const hash = bcrypt.hashSync(password, 10);

  try {
    const result = db.prepare(
      'INSERT INTO empleados (nombre, email, password_hash, role, clave_publica) VALUES (?, ?, ?, ?, ?)'
    ).run(nombre, email, hash, role, clave_publica);

    res.status(201).json({
      id: result.lastInsertRowid,
      nombre,
      email,
      role,
      tiene_clave_publica: clave_publica !== null,
    });
  } catch (e) {
    if (e.message.includes('UNIQUE'))
      return res.status(409).json({ error: 'Email ya registrado' });
    res.status(500).json({ error: 'Error interno' });
  }
});

// GET /empleados
router.get('/', adminAuth, (req, res) => {
  const rows = db.prepare(
    'SELECT id, nombre, email, role, (clave_publica IS NOT NULL) as tiene_clave_publica FROM empleados'
  ).all();
  res.json(rows);
});

// PUT /empleados/:id/clave-publica — actualizar clave pública (cambio de dispositivo)
router.put('/:id/clave-publica', adminAuth, (req, res) => {
  const { clave_publica } = req.body;

  if (!clave_publica)
    return res.status(400).json({ error: 'clave_publica es requerida' });

  try {
    const raw = Buffer.from(clave_publica, 'base64');
    if (raw.length !== 32)
      return res.status(400).json({ error: 'clave_publica debe ser 32 bytes Ed25519 en base64' });
  } catch {
    return res.status(400).json({ error: 'clave_publica no es base64 válido' });
  }

  const result = db.prepare(
    'UPDATE empleados SET clave_publica = ? WHERE id = ?'
  ).run(clave_publica, req.params.id);

  if (result.changes === 0)
    return res.status(404).json({ error: 'Empleado no encontrado' });

  res.json({ ok: true });
});

// DELETE /empleados/:id
router.delete('/:id', adminAuth, (req, res) => {
  db.prepare('DELETE FROM empleados WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
