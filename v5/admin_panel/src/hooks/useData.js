import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../api/client';

// ── useEmpleados ──────────────────────────────────────────────────────────────
export function useEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/empleados');
      setEmpleados(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  return { empleados, loading, error, recargar: cargar };
}

// ── useFichajes ───────────────────────────────────────────────────────────────
export function useFichajes(filtros, pagina, limite) {
  const [resultado, setResultado] = useState({ datos: [], total: 0, paginas: 1 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filtros.empleado_id) params.set('empleado_id', filtros.empleado_id);
      if (filtros.tipo)        params.set('tipo',        filtros.tipo);
      if (filtros.desde)       params.set('desde',       filtros.desde);
      if (filtros.hasta)       params.set('hasta',       filtros.hasta);
      params.set('pagina', pagina);
      params.set('limite',  limite);

      const data = await apiFetch(`/fichajes?${params.toString()}`);
      setResultado(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filtros, pagina, limite]);

  useEffect(() => { cargar(); }, [cargar]);

  return { resultado, loading, error, recargar: cargar };
}
