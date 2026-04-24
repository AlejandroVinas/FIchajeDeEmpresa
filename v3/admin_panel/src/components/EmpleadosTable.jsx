export default function EmpleadosTable({ empleados = [] }) {
  return (
    <div className="card overflow-hidden">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Listado de empleados</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Alta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {empleados.length ? empleados.map((empleado) => (
              <tr key={empleado.id}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{empleado.id}</td>
                <td className="px-4 py-3 font-medium">{empleado.nombre}</td>
                <td className="px-4 py-3">{empleado.email}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                    {empleado.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(empleado.created_at)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">No hay empleados todavía.</td>
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
