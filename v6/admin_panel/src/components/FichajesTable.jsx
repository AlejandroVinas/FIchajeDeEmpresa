export default function FichajesTable({ fichajes = [] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Listado de fichajes</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Empleado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Jornada</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Semanal</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Ubicación</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {fichajes.length ? fichajes.map((fichaje) => (
              <tr key={fichaje.id}>
                <td className="px-4 py-3 whitespace-nowrap">{formatDate(fichaje.fecha_hora)}</td>
                <td className="px-4 py-3 font-medium">{fichaje.empleado_nombre || `Empleado #${fichaje.empleado_id}`}</td>
                <td className="px-4 py-3">{fichaje.empleado_email || '—'}</td>
                <td className="px-4 py-3">
                  <span className={fichaje.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida'}>
                    {fichaje.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                  {formatHours(fichaje.horas_jornada)} h · {fichaje.hora_entrada || '—'}-{fichaje.hora_salida || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatHours(fichaje.horas_semanales)} h</td>
                <td className="px-4 py-3 text-gray-600">{formatLocation(fichaje)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{fichaje.ip || '—'}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" className="px-4 py-8 text-center text-gray-500">No hay fichajes para los filtros seleccionados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES');
}

function formatLocation(row) {
  if (row.lat == null || row.lon == null) return '—';
  return `${Number(row.lat).toFixed(5)}, ${Number(row.lon).toFixed(5)}`;
}

function formatHours(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}
