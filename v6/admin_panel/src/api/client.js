const isElectron = typeof window !== 'undefined' && !!window.fichaje;

let electronBasePromise = null;
let memoryToken = '';

async function resolveBaseUrl() {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }

  if (isElectron) {
    if (!electronBasePromise) {
      electronBasePromise = window.fichaje
        .getBackendPort()
        .then((port) => `http://127.0.0.1:${port}`);
    }

    return electronBasePromise;
  }

  return '/api';
}

export function getStoredToken() {
  return (
    memoryToken ||
    localStorage.getItem('auth_token') ||
    localStorage.getItem('token') ||
    ''
  );
}

export function setStoredToken(token) {
  memoryToken = token || '';

  if (token) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
  }
}

export function setAuthToken(token) {
  setStoredToken(token);
}

export function clearAuthToken() {
  setStoredToken('');
}

export async function apiFetch(path, options = {}, retry = true) {
  const baseUrl = await resolveBaseUrl();
  const token = options.skipAuth ? '' : getStoredToken();

  const headers = new Headers(options.headers || {});
  const bodyIsFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;

  if (!bodyIsFormData && !headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions = { ...options };
  delete fetchOptions.skipAuth;

  const response = await fetch(`${baseUrl}${path}`, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry && !options.skipAuth) {
    const refreshed = await tryRefresh(baseUrl);

    if (refreshed) {
      return apiFetch(path, options, false);
    }
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;

    try {
      const data = await response.json();
      message = data.error || data.message || message;
    } catch {
      // Ignoramos errores de parseo.
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function tryRefresh(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    return response.ok;
  } catch {
    return false;
  }
}