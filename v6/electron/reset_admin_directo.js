const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const dbPath = process.env.APPDATA + '\\fichaje-desktop\\fichajes.db';
const db = new Database(dbPath);

const email = 'admin@empresa.com';
const password = 'Admin12345!';
const hash = bcrypt.hashSync(password, 10);

db.prepare(`
  UPDATE empleados
  SET
    nombre = 'Administrador',
    password_hash = ?,
    role = 'admin',
    activo = 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE email = ?
`).run(hash, email);

const user = db.prepare(`
  SELECT id, nombre, email, password_hash, role, activo
  FROM empleados
  WHERE email = ?
`).get(email);

console.log('DB:', dbPath);
console.log('Usuario:', {
  id: user.id,
  nombre: user.nombre,
  email: user.email,
  role: user.role,
  activo: user.activo,
});

console.log('Hash nuevo:', user.password_hash);
console.log('Password valida:', bcrypt.compareSync(password, user.password_hash));

db.close();
