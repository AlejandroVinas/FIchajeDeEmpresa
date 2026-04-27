const db = require('../db');

function logAudit(actorId, action, entity, entityId, details = {}) {
  try {
    db.prepare(`
      INSERT INTO audit_log (actor_id, action, entity, entity_id, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(actorId || null, action, entity, entityId || null, JSON.stringify(details || {}));
  } catch (err) {
    console.error('No se pudo registrar auditoria:', err.message);
  }
}

module.exports = { logAudit };