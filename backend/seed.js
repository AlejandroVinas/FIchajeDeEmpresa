// Ejecutar UNA vez: node seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db     = require('./db');

const email    = 'admin@empresa.com'; // ← cambia
const password = 'admin1234';         // ← cambia
const nombre   = 'Administrador';

const hash = bcrypt.hashSync(password, 10);

try {
  db.prepare(
    'INSERT INTO empleados (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(nombre, email, hash, 'admin');
  console.log('✅ Admin creado:', email);
} catch (e) {
  console.error('❌ Error (¿ya existe?):', e.message);
}
