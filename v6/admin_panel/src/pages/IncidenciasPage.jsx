import { useEffect, useState } from 'react';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';

const tipos = [
  ['olvido_fichaje', 'Olvido de fichaje'],
  ['correccion', 'Correccion'],
  ['ausencia', 'Ausencia'],
  ['baja_medica', 'Baja medica'],
  ['vacaciones', 'Vacaciones'],
  ['permiso', 'Permiso'],
  ['retraso', 'Retraso'],
  ['otro', 'Otro'],
];

export default function IncidenciasPage() {
  const { user } = useAuth();
  const isManager = ['admin', 'supervisor'].includes(user?.role);

  const [rows, setRows] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [form, setForm] = useState({
    tipo: 'olvido_fichaje',
    empleado_id: '',
    fecha_inicio: new Date().toISOString().slice(0, 10),
    fecha_fin: '',
    descripcion: '',
  });

  async function load() {
    setError('');

    try {
      const data = await apiFetch('/incidencias');
      setRows(Array.isArray(data) ? data : []);

      if (isManager) {
        const emps = await apiFetch('/empleados');
        setEmpleados(Array.isArray(emps) ? emps : []);
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las incidencias');
    }
  }

  useEffect(() => {
    load();
  }, [isManager]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function crearIncidencia(event) {
    event.preventDefault();
    setError('');

    try {
      await apiFetch('/incidencias', {
        method: 'POST',
        body: JSON.stringify(form),
      });

      setForm((prev) => ({
        ...prev,
        descripcion: '',
      }));

      await load();
    } catch (err) {
      setError(err.message || 'No se pudo crear la incidencia');
    }
  }

  async function resolverIncidencia(id, estado) {
    setBusyId(id);
    setError('');

    try {
      await apiFetch('/incidencias/' + id + '/resolver', {
        method: 'POST',
        body: JSON.stringify({
          estado,
          respuesta: estado === 'aprobada' ? 'Incidencia aprobada' : 'Incidencia rechazada',
        }),
      });

      await load();
    } catch (err) {
      setError(err.message || 'No se pudo resolver la incidencia');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-2xl font-bold">Incidencias</h2>
        <p className="text-sm text-gray-500">
          Solicitudes de correccion, ausencias, vacaciones y permisos.
        </p>
      </section>

      {error ? (
        <div className="card p-4 text-red-600">
          {error}
        </div>
      ) : null}

      <form onSubmit={crearIncidencia} className="card grid gap-4 p-5 md:grid-cols-2">
        <h3 className="md:col-span-2 text-lg font-semibold">Nueva incidencia</h3>

        {isManager ? (
          <label className="grid gap-1">
            <span className="text-sm font-medium">Empleado</span>
            <select
              className="input"
              value={form.empleado_id}
              onChange={(event) => updateField('empleado_id', event.target.value)}
            >
              <option value="">Yo mismo</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.nombre}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="grid gap-1">
          <span className="text-sm font-medium">Tipo</span>
          <select
            className="input"
            value={form.tipo}
            onChange={(event) => updateField('tipo', event.target.value)}
          >
            {tipos.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Fecha inicio</span>
          <input
            className="input"
            type="date"
            value={form.fecha_inicio}
            onChange={(event) => updateField('fecha_inicio', event.target.value)}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Fecha fin</span>
          <input
            className="input"
            type="date"
            value={form.fecha_fin}
            onChange={(event) => updateField('fecha_fin', event.target.value)}
          />
        </label>

        <label className="grid gap-1 md:col-span-2">
          <span className="text-sm font-medium">Descripcion</span>
          <textarea
            className="input min-h-[90px]"
            value={form.descripcion}
            onChange={(event) => updateField('descripcion', event.target.value)}
            required
          />
        </label>

        <div className="md:col-span-2">
          <button type="submit" className="btn btn-primary">
            Enviar incidencia
          </button>
        </div>
      </form>

      <section className="card overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-semibold">Listado de incidencias</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Fechas</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Descripcion</th>
                {isManager ? <th className="px-4 py-3 text-left">Acciones</th> : null}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.empleado_nombre || 'Ã¢â‚¬â€'}</td>
                  <td className="px-4 py-3">{row.tipo}</td>
                  <td className="px-4 py-3">
                    {row.fecha_inicio}
                    {row.fecha_fin ? ` a ${row.fecha_fin}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge-${row.estado}`}>
                      {row.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-md">
                    <p>{row.descripcion}</p>
                    {row.respuesta ? (
                      <p className="mt-1 text-xs text-gray-500">
                        Respuesta: {row.respuesta}
                      </p>
                    ) : null}
                  </td>

                  {isManager ? (
                    <td className="px-4 py-3">
                      {row.estado === 'pendiente' ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busyId === row.id}
                            onClick={() => resolverIncidencia(row.id, 'aprobada')}
                          >
                            {busyId === row.id ? 'Guardando...' : 'Aprobar'}
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={busyId === row.id}
                            onClick={() => resolverIncidencia(row.id, 'rechazada')}
                          >
                            {busyId === row.id ? 'Guardando...' : 'Rechazar'}
                          </button>
                        </div>
                      ) : (
                        'Ã¢â‚¬â€'
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}

              {!rows.length ? (
                <tr>
                  <td
                    colSpan={isManager ? 6 : 5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay incidencias.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}