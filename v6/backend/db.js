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
  supervisor_id INTEGER,
  pin_hash TEXT,
  activo INTEGER NOT NULL DEFAULT 1,
  horas_jornada REAL NOT NULL DEFAULT 8,
  hora_entrada TEXT NOT NULL DEFAULT '09:00',
  hora_salida TEXT NOT NULL DEFAULT '17:00',
  horas_semanales REAL NOT NULL DEFAULT 40,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (supervisor_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fichajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha_hora TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lat REAL,
  lon REAL,
  ip TEXT,
  origen TEXT NOT NULL DEFAULT 'app',
  nota TEXT,
  modificado_por INTEGER,
  modificado_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
  FOREIGN KEY (modificado_por) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS incidencias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  descripcion TEXT,
  respuesta TEXT,
  admin_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS calendario_laboral (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'laborable',
  descripcion TEXT,
  horas_objetivo REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES empleados(id) ON DELETE SET NULL
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

addColumnIfMissing('empleados', 'horas_jornada', "REAL NOT NULL DEFAULT 8");
addColumnIfMissing('empleados', 'hora_entrada', "TEXT NOT NULL DEFAULT '09:00'");
addColumnIfMissing('empleados', 'hora_salida', "TEXT NOT NULL DEFAULT '17:00'");
addColumnIfMissing('empleados', 'horas_semanales', "REAL NOT NULL DEFAULT 40");
addColumnIfMissing('empleados', 'supervisor_id', "INTEGER");
addColumnIfMissing('empleados', 'pin_hash', "TEXT");
addColumnIfMissing('empleados', 'activo', "INTEGER NOT NULL DEFAULT 1");
addColumnIfMissing('empleados', 'updated_at', "TEXT");

addColumnIfMissing('fichajes', 'origen', "TEXT NOT NULL DEFAULT 'app'");
addColumnIfMissing('fichajes', 'nota', "TEXT");
addColumnIfMissing('fichajes', 'modificado_por', "INTEGER");
addColumnIfMissing('fichajes', 'modificado_at', "TEXT");

db.exec(`
CREATE INDEX IF NOT EXISTS idx_fichajes_empleado_fecha ON fichajes(empleado_id, fecha_hora);
CREATE INDEX IF NOT EXISTS idx_fichajes_fecha ON fichajes(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias(estado);
CREATE INDEX IF NOT EXISTS idx_incidencias_empleado ON incidencias(empleado_id);
CREATE INDEX IF NOT EXISTS idx_calendario_fecha ON calendario_laboral(fecha);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);
`);

module.exports = db;