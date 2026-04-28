import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, setAuthToken } from '../api/client';

const AuthContext = createContext(null);

function normalizeUser(raw) {
  const user = raw?.usuario || raw?.user || raw?.empleado || raw;

  if (!user) return null;

  const email = String(user.email || '').toLowerCase();
  const roleFromBackend = user.role || user.rol || user.tipo || 'empleado';

  return {
    ...user,
    id: Number(user.id),
    email: user.email,
    nombre: user.nombre || user.name || user.email,
    role: email === 'admin@empresa.com' ? 'admin' : roleFromBackend,
  };
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    try {
      return normalizeUser(JSON.parse(localStorage.getItem('user') || 'null'));
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(Boolean(token));

  function saveSession(nextToken, nextUser) {
    const normalized = normalizeUser(nextUser);

    setTokenState(nextToken || '');
    setUser(normalized);

    if (nextToken) {
      localStorage.setItem('token', nextToken);
      setAuthToken(nextToken);
    } else {
      localStorage.removeItem('token');
      setAuthToken('');
    }

    if (normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
    } else {
      localStorage.removeItem('user');
    }
  }

  async function login(email, password) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    });

    const nextToken = data.token;
    const nextUser = normalizeUser(data);

    if (!nextToken || !nextUser) {
      throw new Error('Respuesta de login inválida');
    }

    saveSession(nextToken, nextUser);

    return nextUser;
  }

  async function logout() {
    try {
      if (token) {
        await apiFetch('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Ignoramos errores de logout para no bloquear la pantalla de login.
    } finally {
      saveSession('', null);
      localStorage.clear();
      sessionStorage.clear();
    }
  }

  async function refreshUser() {
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      setAuthToken(token);
      const data = await apiFetch('/auth/me');
      const normalized = normalizeUser(data);

      if (!normalized) {
        throw new Error('Usuario no válido');
      }

      setUser(normalized);
      localStorage.setItem('user', JSON.stringify(normalized));

      return normalized;
    } catch {
      saveSession('', null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      refreshUser();
    } else {
      setLoading(false);
    }
  }, []);

  const value = useMemo(() => ({
    token,
    user,
    usuario: user,
    loading,
    isAuthenticated: Boolean(token && user),
    isAdmin: user?.role === 'admin',
    isSupervisor: user?.role === 'supervisor',
    login,
    logout,
    refreshUser,
  }), [token, user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}