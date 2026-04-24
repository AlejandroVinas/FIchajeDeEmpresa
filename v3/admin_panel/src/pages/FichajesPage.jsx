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
      return matchesSearch && matchesTipo && matchesEmpleado;
    });

    rows.sort((a, b) => {
      const aTime = new Date(a.fecha_hora).getTime();
      const bTime = new Date(b.fecha_hora).getTime();
      return filters.orden === 'asc' ? aTime - bTime : bTime - aTime;
    });

    return rows;
  }, [fichajes, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pagedRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function handleExport() {
    const headers = ['fecha_hora', 'empleado_nombre', 'empleado_email', 'tipo', 'lat', 'lon', 'ip'];
    const rows = filtered.map((row) => [
      row.fecha_hora,
      row.empleado_nombre || '',
      row.empleado_email || '',
      row.tipo,
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
          <p className="text-sm text-gray-500">Consulta, filtra y exporta el histórico de fichajes.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={handleExport} disabled={!filtered.length}>
          Exportar CSV
        </button>
      </section>

      <FichajesFilter filters={filters} onChange={updateFilter} empleados={empleados} />

      {error ? <div className="card p-4 text-red-600">{error}</div> : null}
      {loading ? <div className="card p-4 text-gray-500">Cargando fichajes…</div> : <FichajesTable fichajes={pagedRows} />}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
