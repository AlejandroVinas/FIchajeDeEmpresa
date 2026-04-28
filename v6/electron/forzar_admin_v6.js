const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const email = 'admin@empresa.com';
const password = 'Admin12345!';
const pin = '123456';

const candidates = [
  path.join(process.env.APPDATA || '', 'fichaje-desktop', 'fichajes.db'),
  path.join(process.env.APPDATA || '', 'Fichaje V6', 'fichajes.db'),
  path.join(process.env.LOCALAPPDATA || '', 'fichaje-desktop', 'fichajes.db'),
  path.join(process.cwd(), 'fichajes.db'),
  path.join(process.cwd(), 'backend', 'fichajes.db'),
].filter(Boolean);

function hasColumn(db, table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
}

function patchDb(dbPath) {
  if (!fs.existsSync(dbPath)) return false;

  let db;

  try {
    db = new Database(dbPath);
  } catch {
    return false;
  }

  try {
    const table = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name = 'empleados'
    `).get();

    if (!table) {
      db.close();
      return false;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const pinHash = bcrypt.hashSync(pin, 10);

    const hasRole = hasColumn(db, 'empleados', 'role');
    const hasPin = hasColumn(db, 'empleados', 'pin_hash');

    const existing = db.prepare(`
      SELECT *
      FROM empleados
      WHERE lower(email) = lower(?)
      LIMIT 1
    `).get(email);

    if (existing) {
      if (hasRole && hasPin) {
        db.prepare(`
          UPDATE empleados
          SET nombre = 'Administrador',
              password_hash = ?,
              role = 'admin',
              pin_hash = ?,
              activo = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE lower(email) = lower(?)
        `).run(passwordHash, pinHash, email);
      } else if (hasRole) {
        db.prepare(`
          UPDATE empleados
          SET nombre = 'Administrador',
              password_hash = ?,
              role = 'admin',
              activo = 1,
              updated_at = CURRENT_TIMESTAMP
          WHERE lower(email) = lower(?)
        `).run(passwordHash, email);
      }
    }

    const admin = db.prepare(`
      SELECT id, nombre, email, role, activo, password_hash
      FROM empleados
      WHERE lower(email) = lower(?)
    `).get(email);

    if (admin) {
      console.log('DB:', dbPath);
      console.log({
        id: admin.id,
        email: admin.email,
        role: admin.role,
        activo: admin.activo,
        password_valida: bcrypt.compareSync(password, admin.password_hash),
      });
    }

    db.close();
    return true;
  } catch (err) {
    console.log('ERROR en:', dbPath, err.message);
    try { db.close(); } catch {}
    return false;
  }
}

let count = 0;

for (const dbPath of [...new Set(candidates)]) {
  if (patchDb(dbPath)) count++;
}

console.log('Bases corregidas:', count);
process.exit(0);
