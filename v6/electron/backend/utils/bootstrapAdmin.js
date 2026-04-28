const bcrypt = require('bcryptjs');
const db = require('../db');

function columnExists(table, column) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((row) => row.name === column);
}

function ensureInitialAdmin() {
  const hasRole = columnExists('empleados', 'role');
  const hasPin = columnExists('empleados', 'pin_hash');

  const email = process.env.SEED_EMAIL || process.env.ADMIN_EMAIL || 'admin@empresa.com';
  const password = process.env.SEED_PASSWORD || process.env.ADMIN_PASSWORD || 'Admin12345!';
  const nombre = process.env.SEED_NOMBRE || process.env.ADMIN_NOMBRE || 'Administrador';
  const pin = process.env.SEED_PIN || process.env.ADMIN_PIN || '123456';

  const passwordHash = bcrypt.hashSync(password, 10);
  const pinHash = bcrypt.hashSync(pin, 10);

  const existing = db.prepare('SELECT id FROM empleados WHERE email = ?').get(email);

  if (existing) {
    if (hasRole && hasPin) {
      db.prepare(`
        UPDATE empleados
        SET nombre = ?,
            password_hash = ?,
            role = 'admin',
            pin_hash = ?,
            activo = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nombre, passwordHash, pinHash, existing.id);
    } else if (hasRole) {
      db.prepare(`
        UPDATE empleados
        SET nombre = ?,
            password_hash = ?,
            role = 'admin',
            activo = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nombre, passwordHash, existing.id);
    } else {
      db.prepare(`
        UPDATE empleados
        SET nombre = ?,
            password_hash = ?,
            activo = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nombre, passwordHash, existing.id);
    }

    console.log('OK: admin inicial asegurado:', email);
    return;
  }

  if (hasRole && hasPin) {
    db.prepare(`
      INSERT INTO empleados (
        nombre,
        email,
        password_hash,
        role,
        pin_hash,
        activo,
        horas_jornada,
        hora_entrada,
        hora_salida,
        horas_semanales
      )
      VALUES (?, ?, ?, 'admin', ?, 1, 8, '09:00', '17:00', 40)
    `).run(nombre, email, passwordHash, pinHash);
  } else if (hasRole) {
    db.prepare(`
      INSERT INTO empleados (
        nombre,
        email,
        password_hash,
        role,
        activo,
        horas_jornada,
        hora_entrada,
        hora_salida,
        horas_semanales
      )
      VALUES (?, ?, ?, 'admin', 1, 8, '09:00', '17:00', 40)
    `).run(nombre, email, passwordHash);
  } else {
    db.prepare(`
      INSERT INTO empleados (
        nombre,
        email,
        password_hash,
        activo,
        horas_jornada,
        hora_entrada,
        hora_salida,
        horas_semanales
      )
      VALUES (?, ?, ?, 1, 8, '09:00', '17:00', 40)
    `).run(nombre, email, passwordHash);
  }

  console.log('OK: admin inicial creado:', email);
}

module.exports = { ensureInitialAdmin };