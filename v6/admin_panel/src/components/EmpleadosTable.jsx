import { useEffect, useState } from 'react';

export default function EmpleadosTable({
  empleados = [],
  supervisores = [],
  onUpdate,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingId && !empleados.some((empleado) => empleado.id === editingId)) {
      setEditingId(null);
      setDraft({});
      setError('');
    }
  }, [empleados, editingId]);

  function startEdit(empleado) {
    setError('');
    setEditingId(empleado.id);
    setDraft({
      nombre: empleado.nombre || '',
      email: empleado.email || '',
      password: '',
      pin: '',
      role: empleado.role || 'empleado',
      supervisor_id: empleado.supervisor_id || '',
      activo: empleado.activo !== false,
      horas_jornada: empleado.horas_jornada ?? 8,
      hora_entrada: empleado.hora_entrada || '09:00',
      hora_salida: empleado.hora_salida || '17:00',
      horas_semanales: empleado.horas_semanales ?? 40,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
    setError('');
  }

  function updateDraft(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function saveEdit(id) {
    setBusyId(id);
    setError('');

    try {
      const payload = {
        ...draft,
        supervisor_id: draft.supervisor_id || null,
        horas_jornada: Number(draft.horas_jornada || 8),
        horas_semanales: Number(draft.horas_semanales || 40),
      };

      if (!payload.password) delete payload.password;
      if (!payload.pin) delete payload.pin;

      await onUpdate(id, payload);
      cancelEdit();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEmpleado(empleado) {
    setError('');

    if (!window.confirm(`¿Eliminar a ${empleado.nombre}?`)) return;

    setBusyId(empleado.id);

    try {
      await onDelete(empleado.id);

      if (editingId === empleado.id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err.message || 'No se pudo eliminar');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Listado de empleados</h2>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Nombre', 'Email', 'Rol', 'Supervisor', 'Activo', 'PIN', 'Jornada', 'Horario', 'Acciones'].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {empleados.map((empleado) => {
              const ed = editingId === empleado.id;

              return (
                <tr key={empleado.id}>
                  <td className="px-4 py-3 min-w-[180px]">
                    {ed ? (
                      <input
                        className="input"
                        value={draft.nombre}
                        onChange={(event) => updateDraft('nombre', event.target.value)}
                      />
                    ) : (
                      <span className="font-medium">{empleado.nombre}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[220px]">
                    {ed ? (
                      <input
                        className="input"
                        type="email"
                        value={draft.email}
                        onChange={(event) => updateDraft('email', event.target.value)}
                      />
                    ) : (
                      empleado.email
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[130px]">
                    {ed ? (
                      <select
                        className="input"
                        value={draft.role}
                        onChange={(event) => updateDraft('role', event.target.value)}
                      >
                        <option value="empleado">Empleado</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {empleado.role}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[180px]">
                    {ed ? (
                      <select
                        className="input"
                        value={draft.supervisor_id}
                        onChange={(event) => updateDraft('supervisor_id', event.target.value)}
                      >
                        <option value="">Sin supervisor</option>
                        {supervisores
                          .filter((supervisor) => supervisor.id !== empleado.id)
                          .map((supervisor) => (
                            <option key={supervisor.id} value={supervisor.id}>
                              {supervisor.nombre}
                            </option>
                          ))}
                      </select>
                    ) : (
                      supervisores.find((supervisor) => supervisor.id === empleado.supervisor_id)?.nombre || '—'
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {ed ? (
                      <input
                        type="checkbox"
                        checked={Boolean(draft.activo)}
                        onChange={(event) => updateDraft('activo', event.target.checked)}
                      />
                    ) : (
                      empleado.activo ? 'Sí' : 'No'
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[130px]">
                    {ed ? (
                      <input
                        className="input"
                        value={draft.pin}
                        placeholder={empleado.tiene_pin ? 'Cambiar PIN' : 'Nuevo PIN'}
                        onChange={(event) => updateDraft('pin', event.target.value)}
                      />
                    ) : (
                      empleado.tiene_pin ? 'Configurado' : '—'
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[160px]">
                    {ed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input"
                          type="number"
                          value={draft.horas_jornada}
                          onChange={(event) => updateDraft('horas_jornada', event.target.value)}
                        />
                        <input
                          className="input"
                          type="number"
                          value={draft.horas_semanales}
                          onChange={(event) => updateDraft('horas_semanales', event.target.value)}
                        />
                      </div>
                    ) : (
                      `${empleado.horas_jornada} h/día · ${empleado.horas_semanales} h/sem`
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[190px]">
                    {ed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="input"
                          type="time"
                          value={draft.hora_entrada}
                          onChange={(event) => updateDraft('hora_entrada', event.target.value)}
                        />
                        <input
                          className="input"
                          type="time"
                          value={draft.hora_salida}
                          onChange={(event) => updateDraft('hora_salida', event.target.value)}
                        />
                      </div>
                    ) : (
                      `${empleado.hora_entrada || '—'} - ${empleado.hora_salida || '—'}`
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[220px]">
                    {ed ? (
                      <div className="flex gap-2">
                        <button
                          className="btn btn-primary"
                          disabled={busyId === empleado.id}
                          onClick={() => saveEdit(empleado.id)}
                        >
                          Guardar
                        </button>
                        <button className="btn btn-ghost" onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost"
                          disabled={busyId !== null}
                          onClick={() => startEdit(empleado)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-danger"
                          disabled={busyId !== null}
                          onClick={() => deleteEmpleado(empleado)}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}

            {!empleados.length ? (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                  No hay empleados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
