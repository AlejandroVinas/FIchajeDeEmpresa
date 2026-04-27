import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import FichajesFilter from '../components/FichajesFilter';
import FichajesTable from '../components/FichajesTable';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 10;
const defaultFilters = {
  search: '',
  tipo: 'todos',
  empleadoId: 'todos',
  fechaDesde: '',
  fechaHasta: '',
  orden: 'desc',
};

export default function FichajesPage() {
  const [fichajes, setFichajes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [fichajesData, empleadosData] = await Promise.all([
          apiFetch('/fichajes'),
          apiFetch('/empleados').catch(() => []),
        ]);
        if (!active) return;
        setFichajes(fichajesData || []);
        setEmpleados(empleadosData || []);
      } catch (err) {
        if (active) setError(err.message || 'No se pudieron cargar los fichajes');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  function updateFilter(field, value) {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  }

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    const rows = fichajes.filter((item) => {
      const matchesSearch = !search || [item.empleado_nombre, item.empleado_email]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(search));

      const matchesTipo = filters.tipo === 'todos' || item.tipo === filters.tipo;
      const matchesEmpleado = filters.empleadoId === 'todos' || String(item.empleado_id) === filters.empleadoId;

      const dateText = (item.fecha_hora || '').slice(0, 10);
      const matchesDesde = !filters.fechaDesde || dateText >= filters.fechaDesde;
      const matchesHasta = !filters.fechaHasta || dateText <= filters.fechaHasta;

      return matchesSearch && matchesTipo && matchesEmpleado && matchesDesde && matchesHasta;
    });

    rows.sort((a, b) => {
      const aTime = new Date(a.fecha_hora).getTime();
      const bTime = new Date(b.fecha_hora).getTime();
      return filters.orden === 'asc' ? aTime - bTime : bTime - aTime;
    });

    return rows;
  }, [fichajes, filters]);

  const resumenSemanal = useMemo(() => {
    if (!empleados.length) return [];
    return buildWeeklySummary(empleados, fichajes);
  }, [empleados, fichajes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function handleExport() {
    const headers = [
      'fecha_hora',
      'empleado_nombre',
      'empleado_email',
      'tipo',
      'horas_jornada',
      'hora_entrada',
      'hora_salida',
      'horas_semanales',
      'lat',
      'lon',
      'ip',
    ];

    const rows = filtered.map((row) => [
      row.fecha_hora,
      row.empleado_nombre || '',
      row.empleado_email || '',
      row.tipo,
      row.horas_jornada ?? '',
      row.hora_entrada ?? '',
      row.hora_salida ?? '',
      row.horas_semanales ?? '',
      row.lat ?? '',
      row.lon ?? '',
      row.ip || '',
    ]);

    const csv = [headers, ...rows]
      .map((cols) => cols.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    if (window.fichaje?.saveFile) {
      await window.fichaje.saveFile('fichajes.csv', csv);
      return;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fichajes.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Fichajes</h2>
          <p className="text-sm text-gray-500">
            Consulta, filtra por fecha y exporta el histÃ³rico de fichajes.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleExport} disabled={!filtered.length}>
          Exportar CSV
        </button>
      </section>

      {resumenSemanal.length ? <ResumenSemanal rows={resumenSemanal} /> : null}

      <FichajesFilter filters={filters} onChange={updateFilter} empleados={empleados} />

      {error ? <div className="card p-4 text-red-600">{error}</div> : null}

      {loading ? (
        <div className="card p-4 text-gray-500">Cargando fichajesâ€¦</div>
      ) : (
        <FichajesTable fichajes={pagedRows} />
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

function ResumenSemanal({ rows }) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h3 className="text-lg font-semibold">Resumen semanal por empleado</h3>
        <p className="text-sm text-gray-500">Horas trabajadas y horas extra de la semana actual.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Empleado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Asignadas</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Trabajadas</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Extras</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.empleado.id}>
                <td className="px-4 py-3 font-medium">{row.empleado.nombre}</td>
                <td className="px-4 py-3">{formatHours(row.horasSemanales)} h</td>
                <td className="px-4 py-3">{formatHours(row.horasTrabajadas)} h</td>
                <td className="px-4 py-3">{formatHours(row.horasExtra)} h</td>
                <td className="px-4 py-3">
                  <span className={row.fichadoAhora ? 'badge-entrada' : 'badge-salida'}>
                    {row.fichadoAhora ? 'dentro' : 'fuera'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildWeeklySummary(empleados, fichajes) {
  const { inicio, fin } = getWeekRange();

  return empleados.map((empleado) => {
    const rows = fichajes
      .filter((item) => item.empleado_id === empleado.id)
      .filter((item) => {
        const fecha = new Date(item.fecha_hora);
        return fecha >= inicio && fecha < fin;
      })
      .sort((a, b) => {
        const dateDiff = new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime();
        return dateDiff || a.id - b.id;
      });

    let entradaAbierta = null;
    let minutos = 0;

    for (const row of rows) {
      if (row.tipo === 'entrada') {
        if (!entradaAbierta) entradaAbierta = row;
      } else if (row.tipo === 'salida' && entradaAbierta) {
        minutos += Math.max(0, Math.round((new Date(row.fecha_hora) - new Date(entradaAbierta.fecha_hora)) / 60000));
        entradaAbierta = null;
      }
    }

    const ultimo = fichajes.find((item) => item.empleado_id === empleado.id);
    const horasTrabajadas = Number((minutos / 60).toFixed(2));
    const horasSemanales = Number(empleado.horas_semanales || 40);

    return {
      empleado,
      horasSemanales,
      horasTrabajadas,
      horasExtra: Number(Math.max(0, horasTrabajadas - horasSemanales).toFixed(2)),
      fichadoAhora: ultimo?.tipo === 'entrada',
    };
  });
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

function formatHours(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}
