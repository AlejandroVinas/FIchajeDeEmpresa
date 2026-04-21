const router    = require('express').Router();
const db        = require('../db');
const auth      = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { estaEnEmpresa }  = require('../utils/geo');
const { ipEnEmpresa }    = require('../utils/ip');
const { verificarFirma } = require('../utils/firma');
const { notificarAdmins } = require('../utils/push');

const TOLERANCIA_TIMESTAMP_MS = 5 * 60 * 1000; // ±5 min anti-replay

// ── POST /fichajes ────────────────────────────────────────────────────────────
router.post('/', auth, (req, res) => {
  const { tipo, lat, lon, plataforma, firma, timestamp } = req.body;

  if (!['entrada', 'salida'].includes(tipo))
    return res.status(400).json({ error: 'tipo debe ser "entrada" o "salida"' });

  if (!timestamp)
    return res.status(400).json({ error: 'timestamp es requerido' });

  const tsCliente = new Date(timestamp).getTime();
  if (isNaN(tsCliente))
    return res.status(400).json({ error: 'timestamp no es una fecha ISO válida' });

  const diff = Math.abs(Date.now() - tsCliente);
  if (diff > TOLERANCIA_TIMESTAMP_MS)
    return res.status(400).json({ error: 'El timestamp está fuera del margen permitido (±5 min)' });

  let fichaLat = null;
  let fichaLon = null;

  if (plataforma === 'desktop') {
    if (!ipEnEmpresa(req))
      return res.status(403).json({ error: 'No estás conectado a la red de la empresa.' });
  } else {
    if (lat == null || lon == null)
      return res.status(400).json({ error: 'lat y lon son requeridos en móvil' });
    if (!estaEnEmpresa(lat, lon))
      return res.status(403).json({ error: 'No estás en la ubicación de la empresa.' });
    fichaLat = lat;
    fichaLon = lon;
  }

  // Verificar firma digital
  let firmaValida = null;
  if (firma) {
    const empleado = db.prepare('SELECT clave_publica FROM empleados WHERE id = ?')
      .get(req.usuario.id);

    if (empleado?.clave_publica) {
      firmaValida = verificarFirma({
        empleadoId:         req.usuario.id,
        tipo,
        timestamp,
        lat:                fichaLat,
        lon:                fichaLon,
        firmaBase64:        firma,
        clavePublicaBase64: empleado.clave_publica,
      }) ? 1 : 0;
    }
  }

  const result = db.prepare(
    `INSERT INTO fichajes (empleado_id, tipo, timestamp, lat, lon, plataforma, firma, firma_valida)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(req.usuario.id, tipo, timestamp, fichaLat, fichaLon, plataforma || 'mobile', firma || null, firmaValida);

  // Notificar a admins (fire & forget)
  const empleadoInfo = db.prepare('SELECT nombre FROM empleados WHERE id = ?')
    .get(req.usuario.id);

  const tipoTexto = tipo === 'entrada' ? '🟢 Entrada' : '🔴 Salida';
  notificarAdmins(db, {
    title: `${tipoTexto} — ${empleadoInfo?.nombre ?? 'Empleado'}`,
    body:  `${new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · ${plataforma || 'móvil'}`,
    icon:  '/icon.png',
  }).catch(err => console.error('[push] Error al notificar:', err));

  res.status(201).json({
    id:          result.lastInsertRowid,
    tipo,
    timestamp,
    firma_valida: firmaValida,
  });
});

// ── GET /fichajes ─────────────────────────────────────────────────────────────
router.get('/', adminAuth, (req, res) => {
  const {
    empleado_id, desde, hasta, tipo,
    pagina = 1, limite = 50,
  } = req.query;

  const limiteParsed = Math.min(Math.max(parseInt(limite) || 50, 1), 200);
  const paginaParsed = Math.max(parseInt(pagina) || 1, 1);
  const offset       = (paginaParsed - 1) * limiteParsed;

  const condiciones = [];
  const params      = [];

  if (empleado_id) { condiciones.push('f.empleado_id = ?');  params.push(parseInt(empleado_id)); }
  if (desde)       { condiciones.push('f.timestamp >= ?');    params.push(desde + 'T00:00:00.000Z'); }
  if (hasta)       { condiciones.push('f.timestamp <= ?');    params.push(hasta + 'T23:59:59.999Z'); }
  if (tipo && ['entrada', 'salida'].includes(tipo)) {
    condiciones.push('f.tipo = ?'); params.push(tipo);
  }

  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) as total FROM fichajes f ${where}`)
    .get(...params).total;

  const rows = db.prepare(`
    SELECT f.id, e.id as empleado_id, e.nombre, e.email,
           f.tipo, f.timestamp, f.lat, f.lon, f.plataforma, f.firma_valida
    FROM fichajes f
    JOIN empleados e ON f.empleado_id = e.id
    ${where}
    ORDER BY f.timestamp DESC
    LIMIT ? OFFSET ?
  `).all(...params, limiteParsed, offset);

  res.json({
    total,
    pagina:  paginaParsed,
    limite:  limiteParsed,
    paginas: Math.ceil(total / limiteParsed),
    datos:   rows,
  });
});

// ── GET /fichajes/empleado/:id ────────────────────────────────────────────────
router.get('/empleado/:id', adminAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT f.id, f.tipo, f.timestamp, f.lat, f.lon, f.plataforma, f.firma_valida
    FROM fichajes f
    WHERE f.empleado_id = ?
    ORDER BY f.timestamp DESC
  `).all(req.params.id);
  res.json(rows);
});

// ── GET /fichajes/exportar.csv ────────────────────────────────────────────────
router.get('/exportar.csv', adminAuth, (req, res) => {
  const { empleado_id, desde, hasta, tipo } = req.query;

  const condiciones = [];
  const params      = [];

  if (empleado_id) { condiciones.push('f.empleado_id = ?'); params.push(parseInt(empleado_id)); }
  if (desde)       { condiciones.push('f.timestamp >= ?');  params.push(desde + 'T00:00:00.000Z'); }
  if (hasta)       { condiciones.push('f.timestamp <= ?');  params.push(hasta + 'T23:59:59.999Z'); }
  if (tipo && ['entrada', 'salida'].includes(tipo)) { condiciones.push('f.tipo = ?'); params.push(tipo); }

  const where = condiciones.length ? 'WHERE ' + condiciones.join(' AND ') : '';

  const rows = db.prepare(`
    SELECT e.nombre, e.email, f.tipo, f.timestamp,
           f.lat, f.lon, f.plataforma, f.firma_valida
    FROM fichajes f
    JOIN empleados e ON f.empleado_id = e.id
    ${where}
    ORDER BY f.timestamp DESC
  `).all(...params);

  const firmaTexto = v => v === 1 ? 'VÁLIDA' : v === 0 ? 'INVÁLIDA' : 'SIN FIRMA';
  const cabecera = 'Nombre,Email,Tipo,Fecha-Hora,Latitud,Longitud,Plataforma,Firma\n';
  const cuerpo = rows.map(r =>
    `"${r.nombre}","${r.email}","${r.tipo}","${r.timestamp}",` +
    `"${r.lat ?? ''}","${r.lon ?? ''}","${r.plataforma}","${firmaTexto(r.firma_valida)}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="fichajes.csv"');
  res.send('\uFEFF' + cabecera + cuerpo);
});

module.exports = router;
