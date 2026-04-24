const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const fallbackDataDir = path.join(__dirname, '..', '.runtime');
const appDataDir = process.env.APP_DATA_DIR || fallbackDataDir;
fs.mkdirSync(appDataDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(appDataDir, 'fichajes.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS empleados (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'empleado',
  horas_jornada REAL NOT NULL DEFAULT 8,
  hora_entrada TEXT NOT NULL DEFAULT '09:00',
  hora_salida TEXT NOT NULL DEFAULT '17:00',
  horas_semanales REAL NOT NULL DEFAULT 40,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fichajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha_hora TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lat REAL,
  lon REAL,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE
);
`);

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
}

function addColumnIfMissing(table, column, definition) {
  if (!hasColumn(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

// Migraciones compatibles con bases de datos ya creadas en versiones anteriores.
addColumnIfMissing('empleados', 'horas_jornada', "REAL NOT NULL DEFAULT 8");
addColumnIfMissing('empleados', 'hora_entrada', "TEXT NOT NULL DEFAULT '09:00'");
addColumnIfMissing('empleados', 'hora_salida', "TEXT NOT NULL DEFAULT '17:00'");
addColumnIfMissing('empleados', 'horas_semanales', "REAL NOT NULL DEFAULT 40");

db.exec(`
CREATE INDEX IF NOT EXISTS idx_fichajes_empleado_fecha
ON fichajes(empleado_id, fecha_hora);
`);

module.exports = db;
