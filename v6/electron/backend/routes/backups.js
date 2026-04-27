const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { logAudit } = require('../utils/audit');

router.use(auth);

function requireAdmin(req, res, next) { if (req.usuario?.role !== 'admin') return res.status(403).json({ error: 'Solo administradores' }); next(); }
function backupsDir() { const dir = path.join(process.env.APP_DATA_DIR || path.join(__dirname, '..', '.runtime'), 'backups'); fs.mkdirSync(dir, { recursive: true }); return dir; }

router.get('/', requireAdmin, (_req, res, next) => {
  try {
    const rows = fs.readdirSync(backupsDir())
      .filter((name) => name.endsWith('.db'))
      .map((name) => {
        const full = path.join(backupsDir(), name);
        const stat = fs.statSync(full);
        return { name, path: full, size: stat.size, created_at: stat.birthtime.toISOString(), modified_at: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.modified_at.localeCompare(a.modified_at));
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAdmin, (req, res, next) => {
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
    const dbPath = process.env.DB_PATH || path.join(process.env.APP_DATA_DIR || path.join(__dirname, '..', '.runtime'), 'fichajes.db');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = `fichajes_backup_${stamp}.db`;
    const target = path.join(backupsDir(), name);
    fs.copyFileSync(dbPath, target);
    const stat = fs.statSync(target);
    logAudit(req.usuario.id, 'created', 'backups', null, { name, size: stat.size });
    res.status(201).json({ ok: true, name, path: target, size: stat.size });
  } catch (err) { next(err); }
});

module.exports = router;