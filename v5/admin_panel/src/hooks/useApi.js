import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api/client';

export function useApi(path, options = {}, auto = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState('');

  const execute = useCallback(async (override = {}) => {
    setLoading(true);
    setError('');
    try {
      const result = await apiFetch(path, { ...options, ...override });
      setData(result);
      return result;
    } catch (err) {
      setError(err.message || 'Error inesperado');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [path, JSON.stringify(options)]);

  useEffect(() => {
    if (auto) {
      execute().catch(() => {});
    }
  }, [execute, auto]);

  return { data, setData, loading, error, execute };
}
