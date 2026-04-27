import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export default function FichajeEmpleadoCard() {
  const [resumen, setResumen] = useState(null);
  const [fichajes, setFichajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [resumenData, fichajesData] = await Promise.all([
        apiFetch('/fichajes/estado'),
        apiFetch('/fichajes'),
      ]);

      setResumen(resumenData);
      setFichajes(fichajesData || []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar tu fichaje');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const fichadoAhora = Boolean(resumen?.fichado_ahora);
  const entradaAbiertaDate = parseDate(resumen?.ultimo_fichaje?.fecha_hora);

  const segundosTurnoActual =
    fichadoAhora && entradaAbiertaDate
      ? Math.max(0, Math.floor((now - entradaAbiertaDate.getTime()) / 1000))
      : 0;

  const minutosTurnoActual = Math.floor(segundosTurnoActual / 60);
  const totalMinutosConTurno = Number(resumen?.total_minutos || 0) + minutosTurnoActual;

  const horasExtraConTurno = Math.max(
    0,
    totalMinutosConTurno / 60 - Number(resumen?.horas_semanales || 40)
  );

  useEffect(() => {
    if (!fichadoAhora) return;

    setNow(Date.now());

    const timerId = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timerId);
  }, [fichadoAhora, resumen?.ultimo_fichaje?.fecha_hora]);

  async function fichar(tipo) {
    setSubmitting(tipo);
    setError('');
    setMessage('');

    try {
      const response = await apiFetch('/fichajes', {
        method: 'POST',
        body: JSON.stringify({ tipo }),
      });

      setResumen(response.resumen);
      setMessage(tipo === 'entrada' ? 'Entrada registrada correctamente.' : 'Salida registrada correctamente.');
      await cargar();
    } catch (err) {
      setError(err.message || 'No se pudo registrar el fichaje');
    } finally {
      setSubmitting('');
    }
  }

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-2xl font-bold">Mi fichaje</h2>
        <p className="text-sm text-gray-500">Registra la entrada y salida de tu turno.</p>
      </section>

      {error ? <div className="card p-4 text-red-600">{error}</div> : null}
      {message ? <div className="card p-4 text-green-700">{message}</div> : null}

      <section className="card grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-sm text-gray-500">Estado actual</p>

          <h3 className="mt-1 text-3xl font-bold">
            {loading ? 'Cargando…' : fichadoAhora ? 'Dentro del turno' : 'Fuera del turno'}
          </h3>

          <p className="mt-3 text-sm text-gray-600">
            {fichadoAhora
              ? `Entrada abierta desde ${formatDate(resumen?.ultimo_fichaje?.fecha_hora)}`
              : 'No tienes ningún turno abierto ahora mismo.'}
          </p>

          {fichadoAhora ? (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
              <p className="text-sm font-medium uppercase tracking-wide text-green-700">
                Tiempo fichado ahora
              </p>

              <p className="mt-2 font-mono text-4xl font-bold tracking-tight text-green-800">
                {formatDuration(segundosTurnoActual)}
              </p>

              <p className="mt-2 text-sm text-green-700">
                Contando desde {formatDate(resumen?.ultimo_fichaje?.fecha_hora)}
              </p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn btn-success"
              onClick={() => fichar('entrada')}
              disabled={loading || fichadoAhora || Boolean(submitting)}
            >
              {submitting === 'entrada' ? 'Registrando…' : 'Fichar entrada'}
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={() => fichar('salida')}
              disabled={loading || !fichadoAhora || Boolean(submitting)}
            >
              {submitting === 'salida' ? 'Registrando…' : 'Fichar salida'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg bg-gray-50 p-4">
          <Metric
            label="Tiempo del turno actual"
            value={fichadoAhora ? formatDuration(segundosTurnoActual) : '—'}
          />

          <Metric
            label="Horas esta semana, incluyendo turno actual"
            value={`${formatHours(totalMinutosConTurno / 60)} h`}
          />

          <Metric
            label="Horas cerradas esta semana"
            value={`${formatHours(resumen?.total_horas)} h`}
          />

          <Metric
            label="Horas semanales asignadas"
            value={`${formatHours(resumen?.horas_semanales)} h`}
          />

          <Metric
            label="Horas extra estimadas"
            value={`${formatHours(horasExtraConTurno)} h`}
          />

          <Metric
            label="Horario asignado"
            value={`${resumen?.empleado?.hora_entrada || '—'} - ${resumen?.empleado?.hora_salida || '—'}`}
          />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-semibold">Mis últimos fichajes</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">IP</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white">
              {fichajes.slice(0, 10).map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{formatDate(item.fecha_hora)}</td>
                  <td className="px-4 py-3">
                    <span className={item.tipo === 'entrada' ? 'badge-entrada' : 'badge-salida'}>
                      {item.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.ip || '—'}</td>
                </tr>
              ))}

              {!fichajes.length && !loading ? (
                <tr>
                  <td colSpan="3" className="px-4 py-8 text-center text-gray-500">
                    Todavía no tienes fichajes.
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

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}

function parseDate(value) {
  if (!value) return null;

  const text = String(value);
  const normalized = text.includes('T') ? text : `${text.replace(' ', 'T')}Z`;
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleString('es-ES');
}

function formatHours(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return '0';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds || 0));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

function pad(value) {
  return String(value).padStart(2, '0');
}