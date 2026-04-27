import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import FichajeEmpleadoCard from '../components/FichajeEmpleadoCard';

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'supervisor'].includes(user?.role);
  const [empleados, setEmpleados] = useState([]);
  const [fichajes, setFichajes] = useState([]);
  const [incidencias, setIncidencias] = useState([]);
  const [incompletos, setIncompletos] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isManager) return;
    async function load() {
      try {
        const [e, f, i, inc] = await Promise.all([
          apiFetch('/empleados'),
          apiFetch('/fichajes'),
          apiFetch('/incidencias'),
          apiFetch('/fichajes/incompletos'),
        ]);
        setEmpleados(e || []); setFichajes(f || []); setIncidencias(i || []); setIncompletos(inc || []);
      } catch (err) { setError(err.message || 'No se pudo cargar el dashboard'); }
    }
    load();
  }, [isManager]);

  const stats = useMemo(() => {
    const activos = empleados.filter((e) => e.activo !== false).length;
    const dentro = incompletos.length;
    const pendientes = incidencias.filter((i) => i.estado === 'pendiente').length;
    const hoy = new Date().toISOString().slice(0, 10);
    const fichajesHoy = fichajes.filter((f) => (f.fecha_hora || '').slice(0, 10) === hoy).length;
    return { activos, dentro, pendientes, fichajesHoy };
  }, [empleados, fichajes, incidencias, incompletos]);

  if (!isManager) return <FichajeEmpleadoCard />;

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-2xl font-bold">Dashboard V6</h2>
        <p className="text-sm text-gray-500">Vista de control con incidencias, fichajes abiertos y actividad del dia.</p>
      </section>

      {error ? <div className="card p-4 text-red-600">{error}</div> : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Empleados activos" value={stats.activos} />
        <Metric title="Trabajando ahora" value={stats.dentro} />
        <Metric title="Incidencias pendientes" value={stats.pendientes} />
        <Metric title="Fichajes hoy" value={stats.fichajesHoy} />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-semibold">Fichajes incompletos</h3>
          <p className="text-sm text-gray-500">Entradas abiertas sin salida registrada.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">Empleado</th><th className="px-4 py-3 text-left">Entrada</th><th className="px-4 py-3 text-left">Tiempo abierto</th></tr></thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {incompletos.map((row) => <tr key={row.id}><td className="px-4 py-3 font-medium">{row.nombre}</td><td className="px-4 py-3">{formatDate(row.ultimo_fichaje?.fecha_hora)}</td><td className="px-4 py-3">{Math.floor(row.minutos_abierto / 60)}h {row.minutos_abierto % 60}m</td></tr>)}
              {!incompletos.length ? <tr><td colSpan="3" className="px-4 py-8 text-center text-gray-500">No hay fichajes incompletos.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b px-5 py-4"><h3 className="text-lg font-semibold">Ultimas incidencias</h3></div>
        <div className="divide-y">
          {incidencias.slice(0, 5).map((item) => (
            <div key={item.id} className="grid gap-1 px-5 py-3 text-sm">
              <div className="flex items-center justify-between"><strong>{item.empleado_nombre}</strong><span className={`badge-${item.estado}`}>{item.estado}</span></div>
              <p className="text-gray-600">{item.tipo} Â· {item.descripcion}</p>
            </div>
          ))}
          {!incidencias.length ? <p className="p-5 text-sm text-gray-500">No hay incidencias.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Metric({ title, value }) { return <div className="card p-5"><p className="text-sm text-gray-500">{title}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>; }
function formatDate(value) { if (!value) return 'â€”'; return new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }