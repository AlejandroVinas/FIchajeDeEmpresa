const webpush = require('web-push');

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

/**
 * Envía una notificación push a todas las suscripciones almacenadas.
 * Elimina automáticamente las suscripciones caducadas.
 *
 * @param {object} db       - Instancia better-sqlite3
 * @param {object} payload  - { title, body, icon? }
 */
async function notificarAdmins(db, payload) {
  const suscripciones = db.prepare('SELECT * FROM push_suscripciones').all();

  const resultados = await Promise.allSettled(
    suscripciones.map(async (row) => {
      const sub = JSON.parse(row.datos);
      try {
        await webpush.sendNotification(sub, JSON.stringify(payload));
      } catch (err) {
        // 410 Gone / 404 → suscripción expirada → borrar
        if (err.statusCode === 410 || err.statusCode === 404) {
          db.prepare('DELETE FROM push_suscripciones WHERE id = ?').run(row.id);
        }
        throw err;
      }
    })
  );

  const fallidos = resultados.filter(r => r.status === 'rejected').length;
  if (fallidos > 0)
    console.warn(`[push] ${fallidos} suscripción(es) fallaron al enviar`);
}

module.exports = { notificarAdmins };
