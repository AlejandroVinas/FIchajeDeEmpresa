const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dbPath = process.env.APPDATA + '\\fichaje-desktop\\fichajes.db';
const db = new Database(dbPath);

const email = 'admin@empresa.com';
const password = 'admin123';
const hash = bcrypt.hashSync(password, 10);

db.prepare(`
  UPDATE empleados
  SET
    nombre = 'Administrador',
    password_hash = ?,
    role = 'admin',
    activo = 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE lower(email) = lower(?)
`).run(hash, email);

const user = db.prepare(`
  SELECT id, nombre, email, password_hash, role, activo
  FROM empleados
  WHERE lower(email) = lower(?)
`).get(email);

console.log('DB:', dbPath);
console.log('Usuario:', {
  id: user?.id,
  nombre: user?.nombre,
  email: user?.email,
  role: user?.role,
  activo: user?.activo,
});
console.log('Password valida admin123:', bcrypt.compareSync(password, user.password_hash));

db.close();
