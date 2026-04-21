const path     = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'fichajes.db');
const db     = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS empleados (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre         TEXT    NOT NULL,
    email          TEXT    UNIQUE NOT NULL,
    password_hash  TEXT    NOT NULL,
    role           TEXT    NOT NULL DEFAULT 'empleado',
    clave_publica  TEXT
  );

  CREATE TABLE IF NOT EXISTS fichajes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id  INTEGER NOT NULL,
    tipo         TEXT    NOT NULL CHECK(tipo IN ('entrada', 'salida')),
    timestamp    TEXT    NOT NULL,
    lat          REAL,
    lon          REAL,
    plataforma   TEXT    NOT NULL DEFAULT 'mobile',
    firma        TEXT,
    firma_valida INTEGER,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id)
  );

  CREATE TABLE IF NOT EXISTS push_suscripciones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    datos     TEXT NOT NULL,
    creado_en TEXT NOT NULL
  );
`);

// Migraciones seguras para bases de datos ya existentes
const migraciones = [
  'ALTER TABLE empleados ADD COLUMN clave_publica TEXT',
  'ALTER TABLE fichajes  ADD COLUMN firma TEXT',
  'ALTER TABLE fichajes  ADD COLUMN firma_valida INTEGER',
  `CREATE TABLE IF NOT EXISTS push_suscripciones (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    datos     TEXT NOT NULL,
    creado_en TEXT NOT NULL
  )`,
];
for (const sql of migraciones) {
  try { db.exec(sql); } catch { /* columna/tabla ya existe */ }
}

module.exports = db;
