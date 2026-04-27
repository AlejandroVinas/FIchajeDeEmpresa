import { useEffect, useState } from 'react';

export default function ConfiguracionPage() {
  const [autoStart, setAutoStart] = useState(false);
  const [runtime, setRuntime] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        if (window.fichaje?.getAutoStart) {
          const settings = await window.fichaje.getAutoStart();
          if (active) setAutoStart(Boolean(settings.openAtLogin));
        }
        if (window.fichaje?.getRuntimeInfo) {
          const info = await window.fichaje.getRuntimeInfo();
          if (active) setRuntime(info);
        }
      } catch (err) { if (active) setError(err.message || 'No se pudo cargar la configuracion'); }
    }
    load(); return () => { active = false; };
  }, []);

  async function toggleAutoStart() {
    setSaving(true); setError(''); setMessage('');
    try {
      const next = !autoStart;
      if (!window.fichaje?.setAutoStart) throw new Error('El inicio automatico solo esta disponible en escritorio');
      const settings = await window.fichaje.setAutoStart(next);
      setAutoStart(Boolean(settings.openAtLogin));
      setMessage(next ? 'Inicio automatico activado.' : 'Inicio automatico desactivado.');
    } catch (err) { setError(err.message || 'No se pudo cambiar el inicio automatico'); }
    finally { setSaving(false); }
  }

  return <div className="grid gap-6"><section><h2 className="text-2xl font-bold">Configuracion</h2><p className="text-sm text-gray-500">Opciones locales de la aplicacion.</p></section>{error ? <div className="card p-4 text-red-600">{error}</div> : null}{message ? <div className="card p-4 text-green-700">{message}</div> : null}<section className="card p-5"><h3 className="text-lg font-semibold">Inicio automatico con Windows</h3><p className="mt-1 text-sm text-gray-500">Permite que Fichaje se abra automaticamente al iniciar el dispositivo.</p><div className="mt-5 flex flex-wrap items-center gap-3"><button type="button" className={autoStart ? 'btn btn-danger' : 'btn btn-primary'} onClick={toggleAutoStart} disabled={saving}>{saving ? 'Guardandoâ€¦' : autoStart ? 'Desactivar inicio automatico' : 'Activar inicio automatico'}</button><span className="text-sm text-gray-600">Estado actual: <strong>{autoStart ? 'activado' : 'desactivado'}</strong></span></div></section><section className="card p-5"><h3 className="text-lg font-semibold">Datos locales</h3><dl className="mt-4 grid gap-3 text-sm"><Info label="Puerto backend" value={runtime?.backendPort || 'â€”'} /><Info label="Carpeta de datos" value={runtime?.userDataPath || 'â€”'} /><Info label="Archivo .env" value={runtime?.envPath || 'â€”'} /></dl></section></div>;
}
function Info({ label, value }) { return <div><dt className="font-medium text-gray-600">{label}</dt><dd className="break-all font-mono text-gray-800">{value}</dd></div>; }