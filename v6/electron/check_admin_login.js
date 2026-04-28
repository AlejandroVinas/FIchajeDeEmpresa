const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dbPath = process.env.APPDATA + '\\fichaje-desktop\\fichajes.db';
const db = new Database(dbPath);

const user = db.prepare('SELECT * FROM empleados WHERE email = ?').get('admin@empresa.com');

console.log('DB:', dbPath);

if (!user) {
  console.log('NO existe admin@empresa.com');
  process.exit(1);
}

console.log('Usuario encontrado:');
console.log({
  id: user.id,
  nombre: user.nombre,
  email: user.email,
  activo: user.activo,
  role: user.role,
  rol: user.rol,
  columnas: Object.keys(user),
});

const hash = user.password_hash || user.passwordHash || user.password;
console.log('Tiene hash:', Boolean(hash));
console.log('Password valida:', bcrypt.compareSync('Admin12345!', hash));
