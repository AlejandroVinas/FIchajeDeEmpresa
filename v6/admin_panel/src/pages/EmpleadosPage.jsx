import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api/client';
import CrearEmpleadoForm from '../components/CrearEmpleadoForm';
import EmpleadosTable from '../components/EmpleadosTable';

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEmpleados() {
    setLoading(true); setError('');
    try { setEmpleados(await apiFetch('/empleados') || []); }
    catch (err) { setError(err.message || 'No se pudo cargar la lista'); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadEmpleados(); }, []);
  async function handleCreate(payload) { const created = await apiFetch('/empleados', { method: 'POST', body: JSON.stringify(payload) }); setEmpleados((prev) => [created, ...prev]); }
  async function handleUpdate(id, payload) { const updated = await apiFetch(`/empleados/${id}`, { method: 'PUT', body: JSON.stringify(payload) }); setEmpleados((prev) => prev.map((item) => item.id === id ? updated : item)); }
  async function handleDelete(id) { await apiFetch(`/empleados/${id}`, { method: 'DELETE' }); setEmpleados((prev) => prev.filter((item) => item.id !== id)); }
  const supervisores = useMemo(() => empleados.filter((e) => ['admin', 'supervisor'].includes(e.role)), [empleados]);

  return <div className="grid gap-6"><section><h2 className="text-2xl font-bold">Empleados</h2><p className="text-sm text-gray-500">Gestiona usuarios, supervisores, PIN de kiosko y jornada.</p></section><CrearEmpleadoForm onCreate={handleCreate} supervisores={supervisores} />{error ? <div className="card p-4 text-red-600">{error}</div> : null}{loading ? <div className="card p-4 text-gray-500">Cargando empleadosâ€¦</div> : <EmpleadosTable empleados={empleados} supervisores={supervisores} onUpdate={handleUpdate} onDelete={handleDelete} />}</div>;
}