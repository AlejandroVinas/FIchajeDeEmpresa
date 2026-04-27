const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const envPath = process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const db = require('./db');

const email = process.env.SEED_EMAIL || 'admin@empresa.com';
const password = process.env.SEED_PASSWORD || 'Admin12345!';
const nombre = process.env.SEED_NOMBRE || 'Administrador';

const existing = db.prepare('SELECT id, email FROM empleados WHERE email = ?').get(email);
if (existing) {
  console.log('OK: el admin inicial ya existe:', email);
  process.exit(0);
}

const hash = bcrypt.hashSync(password, 10);

try {
  db.prepare(`
    INSERT INTO empleados (
      nombre,
      email,
      password_hash,
      role,
      horas_jornada,
      hora_entrada,
      hora_salida,
      horas_semanales
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, email, hash, 'admin', 8, '09:00', '17:00', 40);

  console.log('OK: admin creado:', email);
} catch (e) {
  console.error('ERROR seed:', e.message);
  process.exit(1);
}
