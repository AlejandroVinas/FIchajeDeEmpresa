import { useState } from 'react';

const initialState = {
  nombre: '',
  email: '',
  password: '',
  role: 'empleado',
};

export default function CrearEmpleadoForm({ onCreate }) {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onCreate(form);
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
        <p className="text-sm text-gray-500">Añade un nuevo usuario del sistema.</p>
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

      {error ? <p className="lg:col-span-2 text-sm text-red-600">{error}</p> : null}

      <div className="lg:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Guardando…' : 'Crear empleado'}
        </button>
      </div>
    </form>
  );
}
