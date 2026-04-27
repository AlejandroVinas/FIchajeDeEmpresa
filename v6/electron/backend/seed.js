const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const envPath = process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const db = require('./db');

const email = process.env.SEED_EMAIL || 'admin@empresa.com';
const password = process.env.SEED_PASSWORD || 'Admin12345!';
const nombre = process.env.SEED_NOMBRE || 'Administrador';
const pin = process.env.SEED_PIN || '123456';

const existing = db.prepare('SELECT id, email FROM empleados WHERE email = ?').get(email);
if (existing) {
  console.log('OK: el admin inicial ya existe:', email);
  process.exit(0);
}

const passwordHash = bcrypt.hashSync(password, 10);
const pinHash = bcrypt.hashSync(pin, 10);

try {
  db.prepare(`
    INSERT INTO empleados (nombre, email, password_hash, role, pin_hash, horas_jornada, hora_entrada, hora_salida, horas_semanales)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, email, passwordHash, 'admin', pinHash, 8, '09:00', '17:00', 40);

  console.log('OK: admin creado:', email);
  console.log('PIN kiosco inicial:', pin);
} catch (e) {
  console.error('ERROR seed:', e.message);
  process.exit(1);
}