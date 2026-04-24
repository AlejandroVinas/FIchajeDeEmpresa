import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import CrearEmpleadoForm from '../components/CrearEmpleadoForm';
import EmpleadosTable from '../components/EmpleadosTable';

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadEmpleados() {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/empleados');
      setEmpleados(data || []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmpleados();
  }, []);

  async function handleCreate(payload) {
    const created = await apiFetch('/empleados', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setEmpleados((prev) => [created, ...prev]);
  }

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-2xl font-bold">Empleados</h2>
        <p className="text-sm text-gray-500">Gestiona usuarios del sistema y administradores.</p>
      </section>

      <CrearEmpleadoForm onCreate={handleCreate} />

      {error ? <div className="card p-4 text-red-600">{error}</div> : null}
      {loading ? <div className="card p-4 text-gray-500">Cargando empleados…</div> : <EmpleadosTable empleados={empleados} />}
    </div>
  );
}
