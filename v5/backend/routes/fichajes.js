const router = require('express').Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { getClientIp } = require('../utils/ip');

router.use(auth);

function getLastFichaje(empleadoId) {
  return db.prepare(`
    SELECT *
    FROM fichajes
    WHERE empleado_id = ?
    ORDER BY fecha_hora DESC, id DESC
    LIMIT 1
  `).get(empleadoId);
}

function getEmpleado(empleadoId) {
  return db.prepare(`
    SELECT
      id,
      nombre,
      email,
      role,
      horas_jornada,
      hora_entrada,
      hora_salida,
      horas_semanales
    FROM empleados
    WHERE id = ?
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

function formatIso(value) {
  return value.toISOString();
}

function getResumenSemanal(empleadoId) {
  const empleado = getEmpleado(empleadoId);
  if (!empleado) {
    return null;
  }

  const { inicio, fin } = getWeekRange();

  const rows = db.prepare(`
    SELECT id, empleado_id, tipo, fecha_hora, lat, lon, ip, created_at
    FROM fichajes
    WHERE empleado_id = ?
    ORDER BY fecha_hora ASC, id ASC
  `).all(empleadoId).filter((row) => {
    const fecha = new Date(row.fecha_hora);
    return fecha >= inicio && fecha < fin;
  });

  let entradaAbierta = null;
  let minutosTrabajados = 0;
  const turnos = [];

  for (const row of rows) {
    if (row.tipo === 'entrada') {
      if (!entradaAbierta) entradaAbierta = row;
      continue;
    }

    if (row.tipo === 'salida' && entradaAbierta) {
      const entradaDate = new Date(entradaAbierta.fecha_hora);
      const salidaDate = new Date(row.fecha_hora);
      const minutos = Math.max(0, Math.round((salidaDate - entradaDate) / 60000));

      minutosTrabajados += minutos;
      turnos.push({
        entrada: entradaAbierta,
        salida: row,
        minutos,
        horas: Number((minutos / 60).toFixed(2)),
      });

      entradaAbierta = null;
    }
  }

  const ultimo = getLastFichaje(empleadoId);
  const fichadoAhora = ultimo?.tipo === 'entrada';
  const minutosSemanales = Number(empleado.horas_semanales || 40) * 60;
  const minutosExtra = Math.max(0, minutosTrabajados - minutosSemanales);

  return {
    empleado,
    semana: {
      inicio: formatIso(inicio),
      fin: formatIso(fin),
    },
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
  } catch (err) {
    next(err);
  }
});

router.get('/resumen-semanal', (req, res, next) => {
  try {
    const empleadoId = req.usuario.role === 'admin' && req.query.empleado_id
      ? Number(req.query.empleado_id)
      : req.usuario.id;

    const resumen = getResumenSemanal(empleadoId);
    if (!resumen) return res.status(404).json({ error: 'Empleado no encontrado' });
    res.json(resumen);
  } catch (err) {
    next(err);
  }
});

router.get('/', (req, res, next) => {
  try {
    let rows;

    if (req.usuario.role === 'admin') {
      rows = db.prepare(`
        SELECT
          f.id,
          f.empleado_id,
          e.nombre AS empleado_nombre,
          e.email  AS empleado_email,
          e.horas_jornada,
          e.hora_entrada,
          e.hora_salida,
          e.horas_semanales,
          f.tipo,
          f.fecha_hora,
          f.lat,
          f.lon,
          f.ip,
          f.created_at
        FROM fichajes f
        JOIN empleados e ON e.id = f.empleado_id
        ORDER BY f.fecha_hora DESC, f.id DESC
      `).all();
    } else {
      rows = db.prepare(`
        SELECT
          f.id,
          f.empleado_id,
          e.nombre AS empleado_nombre,
          e.email  AS empleado_email,
          e.horas_jornada,
          e.hora_entrada,
          e.hora_salida,
          e.horas_semanales,
          f.tipo,
          f.fecha_hora,
          f.lat,
          f.lon,
          f.ip,
          f.created_at
        FROM fichajes f
        JOIN empleados e ON e.id = f.empleado_id
        WHERE f.empleado_id = ?
        ORDER BY f.fecha_hora DESC, f.id DESC
      `).all(req.usuario.id);
    }

    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const { tipo, lat = null, lon = null } = req.body;

    if (!['entrada', 'salida'].includes(tipo)) {
      return res.status(400).json({ error: "tipo debe ser 'entrada' o 'salida'" });
    }

    const ultimo = getLastFichaje(req.usuario.id);

    if (tipo === 'entrada' && ultimo?.tipo === 'entrada') {
      return res.status(409).json({
        error: 'Ya tienes una entrada abierta. Primero debes fichar la salida.',
      });
    }

    if (tipo === 'salida' && ultimo?.tipo !== 'entrada') {
      return res.status(409).json({
        error: 'No tienes ninguna entrada abierta. Primero debes fichar la entrada.',
      });
    }

    const info = db.prepare(`
      INSERT INTO fichajes (empleado_id, tipo, lat, lon, ip)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.usuario.id, tipo, lat, lon, getClientIp(req));

    const fichaje = db.prepare(`
      SELECT *
      FROM fichajes
      WHERE id = ?
    `).get(info.lastInsertRowid);

    res.status(201).json({
      ...fichaje,
      fichaje,
      resumen: getResumenSemanal(req.usuario.id),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
