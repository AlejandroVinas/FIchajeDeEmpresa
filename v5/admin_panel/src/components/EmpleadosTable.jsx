import { useState } from 'react';

export default function EmpleadosTable({ empleados = [], onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  function startEdit(empleado) {
    setError('');
    setEditingId(empleado.id);
    setDraft({
      nombre: empleado.nombre || '',
      email: empleado.email || '',
      password: '',
      role: empleado.role || 'empleado',
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
    setDraft((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'horas_jornada') {
        const horasJornada = Number(value);
        if (Number.isFinite(horasJornada) && horasJornada > 0) {
          next.horas_semanales = Number((horasJornada * 5).toFixed(2));
        }
      }

      return next;
    });
  }

  async function saveEdit(id) {
    setBusyId(id);
    setError('');

    try {
      const payload = {
        ...draft,
        horas_jornada: Number(draft.horas_jornada || 8),
        horas_semanales: Number(draft.horas_semanales || 40),
      };

      if (!payload.password) delete payload.password;

      await onUpdate(id, payload);
      cancelEdit();
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el empleado');
    } finally {
      setBusyId(null);
    }
  }

  async function deleteEmpleado(empleado) {
    const ok = window.confirm(`Â¿Eliminar a ${empleado.nombre}? TambiÃ©n se eliminarÃ¡n sus fichajes.`);
    if (!ok) return;

    setBusyId(empleado.id);
    setError('');

    try {
      await onDelete(empleado.id);
      if (editingId === empleado.id) cancelEdit();
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el empleado');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Listado de empleados</h2>
        <p className="text-sm text-gray-500">Edita jornada, horario, rol o contraseÃ±a desde la propia tabla.</p>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Jornada</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Horario</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Semanal</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ContraseÃ±a</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 bg-white">
            {empleados.length ? empleados.map((empleado) => {
              const isEditing = editingId === empleado.id;

              return (
                <tr key={empleado.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{empleado.id}</td>

                  <td className="px-4 py-3 min-w-[180px]">
                    {isEditing ? (
                      <input className="input" value={draft.nombre} onChange={(e) => updateDraft('nombre', e.target.value)} />
                    ) : (
                      <span className="font-medium">{empleado.nombre}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[220px]">
                    {isEditing ? (
                      <input className="input" type="email" value={draft.email} onChange={(e) => updateDraft('email', e.target.value)} />
                    ) : empleado.email}
                  </td>

                  <td className="px-4 py-3 min-w-[130px]">
                    {isEditing ? (
                      <select className="input" value={draft.role} onChange={(e) => updateDraft('role', e.target.value)}>
                        <option value="empleado">Empleado</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                        {empleado.role}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[120px]">
                    {isEditing ? (
                      <input className="input" type="number" min="1" max="24" step="0.25" value={draft.horas_jornada} onChange={(e) => updateDraft('horas_jornada', e.target.value)} />
                    ) : (
                      <span>{formatHours(empleado.horas_jornada)} h/dÃ­a</span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[190px]">
                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input className="input" type="time" value={draft.hora_entrada} onChange={(e) => updateDraft('hora_entrada', e.target.value)} />
                        <input className="input" type="time" value={draft.hora_salida} onChange={(e) => updateDraft('hora_salida', e.target.value)} />
                      </div>
                    ) : (
                      <span>{empleado.hora_entrada || 'â€”'} - {empleado.hora_salida || 'â€”'}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[120px]">
                    {isEditing ? (
                      <input className="input" type="number" min="1" max="80" step="0.25" value={draft.horas_semanales} onChange={(e) => updateDraft('horas_semanales', e.target.value)} />
                    ) : (
                      <span>{formatHours(empleado.horas_semanales)} h</span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[170px]">
                    {isEditing ? (
                      <input className="input" type="password" placeholder="Dejar igual" value={draft.password} onChange={(e) => updateDraft('password', e.target.value)} />
                    ) : (
                      <span className="text-gray-400">No visible</span>
                    )}
                  </td>

                  <td className="px-4 py-3 min-w-[220px]">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-primary" disabled={busyId === empleado.id} onClick={() => saveEdit(empleado.id)}>
                          {busyId === empleado.id ? 'Guardandoâ€¦' : 'Guardar'}
                        </button>
                        <button type="button" className="btn btn-ghost" disabled={busyId === empleado.id} onClick={cancelEdit}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-ghost" disabled={Boolean(busyId)} onClick={() => startEdit(empleado)}>
                          Editar
                        </button>
                        <button type="button" className="btn btn-danger" disabled={Boolean(busyId)} onClick={() => deleteEmpleado(empleado)}>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-gray-500">No hay empleados todavÃ­a.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatHours(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}
