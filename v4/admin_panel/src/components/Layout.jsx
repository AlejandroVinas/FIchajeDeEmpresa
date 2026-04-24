import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function linkClass({ isActive }) {
  return [
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100',
  ].join(' ');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [version, setVersion] = useState('web');

  useEffect(() => {
    let mounted = true;
    if (window.fichaje?.getAppVersion) {
      window.fichaje.getAppVersion().then((v) => mounted && setVersion(v)).catch(() => {});
    }
    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Sistema de fichaje</p>
            <h1 className="text-2xl font-bold">{user?.role === 'admin' ? 'Panel de administración' : 'Panel del empleado'}</h1>
          </div>
          <div className="text-right">
            <p className="font-medium">{user?.nombre || user?.email}</p>
            <p className="text-sm text-gray-500">Rol: {user?.role} · v{version}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8">
        <aside className="card h-fit p-3">
          <nav className="flex flex-col gap-2">
            <NavLink to="/" end className={linkClass}>{user?.role === 'admin' ? 'Dashboard' : 'Mi fichaje'}</NavLink>
            {user?.role === 'admin' ? <NavLink to="/empleados" className={linkClass}>Empleados</NavLink> : null}
            <NavLink to="/fichajes" className={linkClass}>{user?.role === 'admin' ? 'Fichajes' : 'Mi historial'}</NavLink>
            <button type="button" className="btn btn-ghost justify-center" onClick={handleLogout}>
              Cerrar sesión
            </button>
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
