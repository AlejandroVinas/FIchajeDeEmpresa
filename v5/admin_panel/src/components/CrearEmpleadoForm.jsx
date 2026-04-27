import { useState } from 'react';

const initialState = {
  nombre: '',
  email: '',
  password: '',
  role: 'empleado',
  horas_jornada: 8,
  hora_entrada: '09:00',
  hora_salida: '17:00',
  horas_semanales: 40,
};

export default function CrearEmpleadoForm({ onCreate }) {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

 function update(field, value) {
  setForm((prev) => {
    const next = {
      ...prev,
      [field]: value,
    };

    if (field === 'horas_jornada') {
      const horasJornada = Number(value);

      if (Number.isFinite(horasJornada) && horasJornada > 0) {
        next.horas_semanales = Number((horasJornada * 5).toFixed(2));
      }
    }

    return next;
  });
}

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onCreate({
        ...form,
        horas_jornada: Number(form.horas_jornada || 8),
        horas_semanales: Number(form.horas_semanales || 40),
      });
      setForm(initialState);
    } catch (err) {
      setError(err.message || 'No se pudo crear el empleado');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid gap-4 p-5 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold">Crear empleado</h2>
        <p className="text-sm text-gray-500">
          Añade un nuevo usuario y define su jornada laboral.
        </p>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Nombre</span>
        <input className="input" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Email</span>
        <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Contraseña</span>
        <input className="input" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Rol</span>
        <select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}>
          <option value="empleado">Empleado</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Horas por jornada</span>
        <input
          className="input"
          type="number"
          min="1"
          max="24"
          step="0.25"
          value={form.horas_jornada}
          onChange={(e) => update('horas_jornada', e.target.value)}
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Horas semanales</span>
        <input
          className="input"
          type="number"
          min="1"
          max="80"
          step="0.25"
          value={form.horas_semanales}
          onChange={(e) => update('horas_semanales', e.target.value)}
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Hora de entrada</span>
        <input
          className="input"
          type="time"
          value={form.hora_entrada}
          onChange={(e) => update('hora_entrada', e.target.value)}
          required
        />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Hora de salida</span>
        <input
          className="input"
          type="time"
          value={form.hora_salida}
          onChange={(e) => update('hora_salida', e.target.value)}
          required
        />
      </label>

      {error ? <p className="lg:col-span-2 text-sm text-red-600">{error}</p> : null}

      <div className="lg:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Crear empleado'}
        </button>
      </div>
    </form>
  );
}
