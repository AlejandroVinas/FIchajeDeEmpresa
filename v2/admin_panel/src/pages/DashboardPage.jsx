import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';

export default function DashboardPage() {
  const [empleados, setEmpleados] = useState([]);
  const [fichajes, setFichajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [empleadosData, fichajesData] = await Promise.all([
          apiFetch('/empleados'),
          apiFetch('/fichajes'),
        ]);
        if (!active) return;
        setEmpleados(empleadosData || []);
        setFichajes(fichajesData || []);
      } catch (err) {
        if (active) setError(err.message || 'No se pudo cargar el dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const hoy = new Date().toISOString().slice(0, 10);
    const fichajesHoy = fichajes.filter((item) => (item.fecha_hora || '').slice(0, 10) === hoy);
    const entradasHoy = fichajesHoy.filter((item) => item.tipo === 'entrada').length;
    const salidasHoy = fichajesHoy.filter((item) => item.tipo === 'salida').length;
    return {
      empleados: empleados.length,
      fichajes: fichajes.length,
      entradasHoy,
      salidasHoy,
    };
  }, [empleados, fichajes]);

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-2xl font-bold">Resumen</h2>
        <p className="text-sm text-gray-500">Vista rápida del estado del sistema.</p>
      </section>

      {error ? <div className="card p-4 text-red-600">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Empleados" value={loading ? '…' : stats.empleados} />
        <StatCard label="Fichajes totales" value={loading ? '…' : stats.fichajes} />
        <StatCard label="Entradas hoy" value={loading ? '…' : stats.entradasHoy} />
        <StatCard label="Salidas hoy" value={loading ? '…' : stats.salidasHoy} />
      </section>

      <section className="card p-5">
        <h3 className="text-lg font-semibold">Últimos fichajes</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4">Fecha</th>
                <th className="pb-3 pr-4">Empleado</th>
                <th className="pb-3 pr-4">Tipo</th>
                <th className="pb-3 pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {fichajes.slice(0, 8).map((item) => (
                <tr key={item.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4">{new Date(item.fecha_hora).toLocaleString('es-ES')}</td>
                  <td className="py-3 pr-4">{item.empleado_nombre || item.empleado_id}</td>
                  <td className="py-3 pr-4">
                    <span className={item.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida'}>{item.tipo}</span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-gray-500">{item.ip || '—'}</td>
                </tr>
              ))}
              {!fichajes.length && !loading ? (
                <tr>
                  <td colSpan="4" className="py-6 text-center text-gray-500">Todavía no hay fichajes.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  );
}
