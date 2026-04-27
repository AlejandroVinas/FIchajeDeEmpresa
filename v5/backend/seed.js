const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

const envPath = process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const db = require('./db');

const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
const nombre = process.env.SEED_NOMBRE;

if (!email || !password || !nombre) {
  console.error('❌ Define SEED_EMAIL, SEED_PASSWORD y SEED_NOMBRE en el fichero .env antes de ejecutar seed.js');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);

try {
  db.prepare(
    'INSERT INTO empleados (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(nombre, email, hash, 'admin');
  console.log('✅ Admin creado:', email);
} catch (e) {
  if (e.message.includes('UNIQUE')) {
    console.error('❌ Ya existe un empleado con ese email.');
  } else {
    console.error('❌ Error:', e.message);
  }
  process.exit(1);
}
