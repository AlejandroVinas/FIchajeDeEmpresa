const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { getClientIp } = require('../utils/ip');
const { logAudit } = require('../utils/audit');

router.use(auth);

function isManager(req) { return ['admin', 'supervisor'].includes(req.usuario?.role); }
function requireManager(req, res, next) { if (!isManager(req)) return res.status(403).json({ error: 'Solo administradores o supervisores' }); next(); }

function getLastFichaje(empleadoId) {
  return db.prepare('SELECT * FROM fichajes WHERE empleado_id = ? ORDER BY fecha_hora DESC, id DESC LIMIT 1').get(empleadoId);
}

function getEmpleado(empleadoId) {
  return db.prepare(`
    SELECT id, nombre, email, role, supervisor_id, horas_jornada, hora_entrada, hora_salida, horas_semanales
    FROM empleados WHERE id = ?
  `).get(empleadoId);
}

function getWeekRange() {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay();
  const inicio = new Date(now);
  inicio.setDate(now.getDate() - day + 1);
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 7);
  return { inicio, fin };
}

function formatIso(value) { return value.toISOString(); }

function canSeeEmployee(req, empleadoId) {
  if (req.usuario.role === 'admin') return true;
  if (req.usuario.role === 'supervisor') {
    const empleado = getEmpleado(empleadoId);
    return empleado && (empleado.supervisor_id === req.usuario.id || empleado.id === req.usuario.id);
  }
  return empleadoId === req.usuario.id;
}

function getResumenSemanal(empleadoId) {
  const empleado = getEmpleado(empleadoId);
  if (!empleado) return null;
  const { inicio, fin } = getWeekRange();

  const rows = db.prepare('SELECT * FROM fichajes WHERE empleado_id = ? ORDER BY fecha_hora ASC, id ASC')
    .all(empleadoId)
    .filter((row) => {
      const fecha = new Date(row.fecha_hora);
      return fecha >= inicio && fecha < fin;
    });

  let entradaAbierta = null;
  let minutosTrabajados = 0;
  const turnos = [];

  for (const row of rows) {
    if (row.tipo === 'entrada') { if (!entradaAbierta) entradaAbierta = row; continue; }
    if (row.tipo === 'salida' && entradaAbierta) {
      const minutos = Math.max(0, Math.round((new Date(row.fecha_hora) - new Date(entradaAbierta.fecha_hora)) / 60000));
      minutosTrabajados += minutos;
      turnos.push({ entrada: entradaAbierta, salida: row, minutos, horas: Number((minutos / 60).toFixed(2)) });
      entradaAbierta = null;
    }
  }

  const ultimo = getLastFichaje(empleadoId);
  const fichadoAhora = ultimo?.tipo === 'entrada';
  const minutosSemanales = Number(empleado.horas_semanales || 40) * 60;
  const minutosExtra = Math.max(0, minutosTrabajados - minutosSemanales);

  return {
    empleado,
    semana: { inicio: formatIso(inicio), fin: formatIso(fin) },
    estado: fichadoAhora ? 'dentro' : 'fuera',
    fichado_ahora: fichadoAhora,
    ultimo_fichaje: ultimo || null,
    fichaje_abierto: fichadoAhora ? ultimo : null,
    total_minutos: minutosTrabajados,
    total_horas: Number((minutosTrabajados / 60).toFixed(2)),
    horas_semanales: Number(empleado.horas_semanales || 40),
    horas_extra: Number((minutosExtra / 60).toFixed(2)),
    turnos,
  };
}

router.get('/estado', (req, res, next) => {
  try {
    const resumen = getResumenSemanal(req.usuario.id);
    if (!resumen) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(resumen);
  } catch (err) { next(err); }
});

router.get('/resumen-semanal', (req, res, next) => {
  try {
    const empleadoId = isManager(req) && req.query.empleado_id ? Number(req.query.empleado_id) : req.usuario.id;
    if (!canSeeEmployee(req, empleadoId)) return res.status(403).json({ error: 'No puedes ver este empleado' });
    const resumen = getResumenSemanal(empleadoId);
    if (!resumen) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(resumen);
  } catch (err) { next(err); }
});

router.get('/incompletos', requireManager, (req, res, next) => {
  try {
    const empleados = req.usuario.role === 'supervisor'
      ? db.prepare('SELECT id, nombre, email FROM empleados WHERE activo = 1 AND supervisor_id = ? ORDER BY nombre ASC').all(req.usuario.id)
      : db.prepare('SELECT id, nombre, email FROM empleados WHERE activo = 1 ORDER BY nombre ASC').all();

    const rows = empleados.map((empleado) => ({ empleado, ultimo: getLastFichaje(empleado.id) }))
      .filter((item) => item.ultimo?.tipo === 'entrada')
      .map((item) => ({ ...item.empleado, ultimo_fichaje: item.ultimo, minutos_abierto: Math.round((Date.now() - new Date(item.ultimo.fecha_hora).getTime()) / 60000) }));

    res.json(rows);
  } catch (err) { next(err); }
});

router.get('/', (req, res, next) => {
  try {
    let rows;
    const select = `
      SELECT f.id, f.empleado_id, e.nombre AS empleado_nombre, e.email AS empleado_email,
             e.horas_jornada, e.hora_entrada, e.hora_salida, e.horas_semanales,
             f.tipo, f.fecha_hora, f.lat, f.lon, f.ip, f.origen, f.nota, f.created_at
      FROM fichajes f JOIN empleados e ON e.id = f.empleado_id
    `;

    if (req.usuario.role === 'admin') rows = db.prepare(`${select} ORDER BY f.fecha_hora DESC, f.id DESC`).all();
    else if (req.usuario.role === 'supervisor') rows = db.prepare(`${select} WHERE e.supervisor_id = ? OR e.id = ? ORDER BY f.fecha_hora DESC, f.id DESC`).all(req.usuario.id, req.usuario.id);
    else rows = db.prepare(`${select} WHERE f.empleado_id = ? ORDER BY f.fecha_hora DESC, f.id DESC`).all(req.usuario.id);

    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', (req, res, next) => {
  try {
    const { tipo, lat = null, lon = null } = req.body;
    if (!['entrada', 'salida'].includes(tipo)) return res.status(400).json({ error: "tipo debe ser 'entrada' o 'salida'" });

    const ultimo = getLastFichaje(req.usuario.id);
    if (tipo === 'entrada' && ultimo?.tipo === 'entrada') return res.status(409).json({ error: 'Ya tienes una entrada abierta. Primero debes fichar la salida.' });
    if (tipo === 'salida' && ultimo?.tipo !== 'entrada') return res.status(409).json({ error: 'No tienes ninguna entrada abierta. Primero debes fichar la entrada.' });

    const info = db.prepare('INSERT INTO fichajes (empleado_id, tipo, lat, lon, ip, origen) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.usuario.id, tipo, lat, lon, getClientIp(req), 'app');
    const fichaje = db.prepare('SELECT * FROM fichajes WHERE id = ?').get(info.lastInsertRowid);
    logAudit(req.usuario.id, 'created', 'fichajes', info.lastInsertRowid, { tipo });
    res.status(201).json({ ...fichaje, fichaje, resumen: getResumenSemanal(req.usuario.id) });
  } catch (err) { next(err); }
});

router.post('/manual', requireManager, (req, res, next) => {
  try {
    const empleadoId = Number(req.body.empleado_id);
    const tipo = req.body.tipo;
    const fechaHora = req.body.fecha_hora || new Date().toISOString();
    const nota = req.body.nota || 'Correccion manual';

    if (!canSeeEmployee(req, empleadoId)) return res.status(403).json({ error: 'No puedes modificar este empleado' });
    if (!['entrada', 'salida'].includes(tipo)) return res.status(400).json({ error: "tipo debe ser 'entrada' o 'salida'" });

    const info = db.prepare(`
      INSERT INTO fichajes (empleado_id, tipo, fecha_hora, ip, origen, nota, modificado_por, modificado_at)
      VALUES (?, ?, ?, ?, 'manual', ?, ?, CURRENT_TIMESTAMP)
    `).run(empleadoId, tipo, fechaHora, getClientIp(req), nota, req.usuario.id);

    logAudit(req.usuario.id, 'manual_created', 'fichajes', info.lastInsertRowid, { empleado_id: empleadoId, tipo, fecha_hora: fechaHora, nota });
    res.status(201).json(db.prepare('SELECT * FROM fichajes WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) { next(err); }
});

module.exports = router;