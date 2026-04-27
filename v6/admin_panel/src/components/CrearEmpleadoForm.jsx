import { useState } from 'react';

const initialState = {
  nombre: '', email: '', password: '', pin: '', role: 'empleado', supervisor_id: '',
  horas_jornada: 8, hora_entrada: '09:00', hora_salida: '17:00', horas_semanales: 40,
};

export default function CrearEmpleadoForm({ onCreate, supervisores = [] }) {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'horas_jornada') {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) next.horas_semanales = Number((n * 5).toFixed(2));
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault(); setSubmitting(true); setError('');
    try {
      await onCreate({ ...form, supervisor_id: form.supervisor_id || null, horas_jornada: Number(form.horas_jornada || 8), horas_semanales: Number(form.horas_semanales || 40) });
      setForm(initialState);
    } catch (err) { setError(err.message || 'No se pudo crear el empleado'); }
    finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid gap-4 p-5 lg:grid-cols-2">
      <div className="lg:col-span-2"><h2 className="text-lg font-semibold">Crear empleado</h2><p className="text-sm text-gray-500">V6 permite supervisor, PIN de kiosko y jornada laboral.</p></div>
      <Field label="Nombre"><input className="input" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} required /></Field>
      <Field label="Email"><input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></Field>
      <Field label="ContraseÃ±a"><input className="input" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required /></Field>
      <Field label="PIN kiosko"><input className="input" value={form.pin} onChange={(e) => update('pin', e.target.value)} placeholder="Ej. 1234 o 123456" /></Field>
      <Field label="Rol"><select className="input" value={form.role} onChange={(e) => update('role', e.target.value)}><option value="empleado">Empleado</option><option value="supervisor">Supervisor</option><option value="admin">Admin</option></select></Field>
      <Field label="Supervisor"><select className="input" value={form.supervisor_id} onChange={(e) => update('supervisor_id', e.target.value)}><option value="">Sin supervisor</option>{supervisores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></Field>
      <Field label="Horas por jornada"><input className="input" type="number" min="1" max="24" step="0.25" value={form.horas_jornada} onChange={(e) => update('horas_jornada', e.target.value)} required /></Field>
      <Field label="Horas semanales"><input className="input" type="number" min="1" max="80" step="0.25" value={form.horas_semanales} onChange={(e) => update('horas_semanales', e.target.value)} required /></Field>
      <Field label="Hora de entrada"><input className="input" type="time" value={form.hora_entrada} onChange={(e) => update('hora_entrada', e.target.value)} required /></Field>
      <Field label="Hora de salida"><input className="input" type="time" value={form.hora_salida} onChange={(e) => update('hora_salida', e.target.value)} required /></Field>
      {error ? <p className="lg:col-span-2 text-sm text-red-600">{error}</p> : null}
      <div className="lg:col-span-2"><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Guardandoâ€¦' : 'Crear empleado'}</button></div>
    </form>
  );
}
function Field({ label, children }) { return <label className="grid gap-1"><span className="text-sm font-medium">{label}</span>{children}</label>; }