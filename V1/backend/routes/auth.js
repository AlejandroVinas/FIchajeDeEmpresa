const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { JWT_SECRET } = require('../config');

// POST /auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const empleado = db.prepare('SELECT * FROM empleados WHERE email = ?').get(email);
  if (!empleado || !bcrypt.compareSync(password, empleado.password_hash))
    return res.status(401).json({ error: 'Credenciales incorrectas' });

  const token = jwt.sign(
    { id: empleado.id, email: empleado.email, role: empleado.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({ token, nombre: empleado.nombre, role: empleado.role });
});

module.exports = router;
