const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');

const email = 'admin@empresa.com';
const password = 'Admin12345!';
const pin = '123456';

const roots = [
  process.env.APPDATA,
  process.env.LOCALAPPDATA,
].filter(Boolean);

function skipDir(name) {
  const n = name.toLowerCase();
  return (
    n.includes('cache') ||
    n.includes('gpu') ||
    n.includes('crash') ||
    n.includes('logs') ||
    n.includes('temp') ||
    n.includes('sessions') ||
    n.includes('blob_storage') ||
    n.includes('service worker')
  );
}

function walk(dir, depth = 0, out = []) {
  if (!dir || !fs.existsSync(dir) || depth > 8) return out;

  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!skipDir(entry.name)) {
        walk(full, depth + 1, out);
      }
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();

      if (
        lower.endsWith('.db') ||
        lower.endsWith('.sqlite') ||
        lower.endsWith('.sqlite3')
      ) {
        out.push(full);
      }
    }
  }

  return out;
}

function quote(col) {
  return `"${String(col).replace(/"/g, '""')}"`;
}

function tableExists(db, table) {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(table);

  return Boolean(row);
}

function patchDb(dbPath) {
  let db;

  try {
    db = new Database(dbPath);
  } catch {
    return false;
  }

  try {
    if (!tableExists(db, 'empleados')) {
      db.close();
      return false;
    }

    const cols = db.prepare('PRAGMA table_info(empleados)').all().map((c) => c.name);
    const has = (col) => cols.includes(col);

    if (!has('email')) {
      db.close();
      return false;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const pinHash = bcrypt.hashSync(pin, 10);

    const values = {
      nombre: 'Administrador',
      email,
      password_hash: passwordHash,
      passwordHash,
      password: passwordHash,
      role: 'admin',
      rol: 'admin',
      pin_hash: pinHash,
      pinHash,
      pin,
      activo: 1,
      is_active: 1,
      horas_jornada: 8,
      hora_entrada: '09:00',
      hora_salida: '17:00',
      horas_semanales: 40,
      updated_at: new Date().toISOString(),
    };

    const existing = db.prepare('SELECT * FROM empleados WHERE email = ?').get(email);

    if (existing) {
      const sets = [];
      const params = [];

      for (const [col, value] of Object.entries(values)) {
        if (has(col) && col !== 'email') {
          sets.push(`${quote(col)} = ?`);
          params.push(value);
        }
      }

      if (!sets.length) {
        db.close();
        return false;
      }

      params.push(email);

      db.prepare(`
        UPDATE empleados
        SET ${sets.join(', ')}
        WHERE email = ?
      `).run(...params);

      console.log('OK admin actualizado en:');
      console.log(dbPath);
    } else {
      const insertCols = [];
      const placeholders = [];
      const params = [];

      for (const [col, value] of Object.entries(values)) {
        if (has(col)) {
          insertCols.push(quote(col));
          placeholders.push('?');
          params.push(value);
        }
      }

      db.prepare(`
        INSERT INTO empleados (${insertCols.join(', ')})
        VALUES (${placeholders.join(', ')})
      `).run(...params);

      console.log('OK admin creado en:');
      console.log(dbPath);
    }

    db.close();
    return true;
  } catch (err) {
    console.log('ERROR parcheando:');
    console.log(dbPath);
    console.log(err.message);

    try {
      db.close();
    } catch {}

    return false;
  }
}

const dbs = roots
  .flatMap((root) => walk(root))
  .filter((item, index, arr) => arr.indexOf(item) === index);

console.log('Bases encontradas:', dbs.length);

let patched = 0;

for (const dbPath of dbs) {
  if (patchDb(dbPath)) {
    patched++;
  }
}

console.log('');
console.log('Bases parcheadas:', patched);
console.log('');
console.log('Credenciales finales:');
console.log('Email:', email);
console.log('Contraseña:', password);
console.log('PIN:', pin);

if (patched === 0) {
  console.log('');
  console.log('No se encontró ninguna base válida con tabla empleados.');
  console.log('Abre una vez la app instalada, ciérrala y vuelve a ejecutar este script.');
  process.exit(1);
}