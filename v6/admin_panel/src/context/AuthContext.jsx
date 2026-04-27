import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, setStoredToken } from '../api/client';

const AuthContext = createContext(null);
const USER_KEY = 'auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      if (!user) { setLoading(false); return; }
      try {
        const me = await apiFetch('/auth/me');
        const nextUser = { id: me.id, email: me.email, nombre: me.nombre, role: me.role, supervisor_id: me.supervisor_id };
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
      } catch {
        setStoredToken('');
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally { setLoading(false); }
    }
    loadMe();
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    const nextUser = { id: data.id, email: data.email || email, nombre: data.nombre, role: data.role, supervisor_id: data.supervisor_id };
    setStoredToken(data.token || '');
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }, false); } catch {}
    finally { setStoredToken(''); localStorage.removeItem(USER_KEY); setUser(null); }
  };

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}