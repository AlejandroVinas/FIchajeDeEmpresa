export default function FichajesFilter({ filters, onChange, empleados = [] }) {
  return (
    <div className="card grid gap-4 p-5 md:grid-cols-3 xl:grid-cols-6">
      <label className="grid gap-1">
        <span className="text-sm font-medium">Buscar</span>
        <input
          className="input"
          placeholder="Nombre o email"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Tipo</span>
        <select className="input" value={filters.tipo} onChange={(e) => onChange('tipo', e.target.value)}>
          <option value="todos">Todos</option>
          <option value="entrada">Entrada</option>
          <option value="salida">Salida</option>
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Empleado</span>
        <select className="input" value={filters.empleadoId} onChange={(e) => onChange('empleadoId', e.target.value)}>
          <option value="todos">Todos</option>
          {empleados.map((empleado) => (
            <option key={empleado.id} value={String(empleado.id)}>
              {empleado.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Desde</span>
        <input
          className="input"
          type="date"
          value={filters.fechaDesde}
          onChange={(e) => onChange('fechaDesde', e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Hasta</span>
        <input
          className="input"
          type="date"
          value={filters.fechaHasta}
          onChange={(e) => onChange('fechaHasta', e.target.value)}
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Orden</span>
        <select className="input" value={filters.orden} onChange={(e) => onChange('orden', e.target.value)}>
          <option value="desc">MÃ¡s recientes primero</option>
          <option value="asc">MÃ¡s antiguos primero</option>
        </select>
      </label>
    </div>
  );
}
