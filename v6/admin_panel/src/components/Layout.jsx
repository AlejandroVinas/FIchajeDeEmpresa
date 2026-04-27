import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

function linkClass({ isActive }) {
  return ['rounded-md px-3 py-2 text-sm font-medium transition-colors', isActive ? 'bg-brand text-white' : 'text-gray-700 hover:bg-gray-100'].join(' ');
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [version, setVersion] = useState('6.0.0');

  useEffect(() => {
    let mounted = true;
    if (window.fichaje?.getAppVersion) window.fichaje.getAppVersion().then((v) => mounted && setVersion(v)).catch(() => {});
    return () => { mounted = false; };
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const isAdmin = user?.role === 'admin';
  const isManager = ['admin', 'supervisor'].includes(user?.role);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Sistema de fichaje V6</p>
            <h1 className="text-2xl font-bold">{isManager ? 'Panel de gestion' : 'Panel del empleado'}</h1>
          </div>
          <div className="text-right">
            <p className="font-medium">{user?.nombre || user?.email}</p>
            <p className="text-sm text-gray-500">Rol: {user?.role} Â· v{version}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8">
        <aside className="card h-fit p-3">
          <nav className="flex flex-col gap-2">
            <NavLink to="/" end className={linkClass}>{isManager ? 'Dashboard' : 'Mi fichaje'}</NavLink>
            {isAdmin ? <NavLink to="/empleados" className={linkClass}>Empleados</NavLink> : null}
            <NavLink to="/fichajes" className={linkClass}>{isManager ? 'Fichajes' : 'Mi historial'}</NavLink>
            <NavLink to="/incidencias" className={linkClass}>Incidencias</NavLink>
            {isManager ? <NavLink to="/calendario" className={linkClass}>Calendario laboral</NavLink> : null}
            {isAdmin ? <NavLink to="/backups" className={linkClass}>Backups</NavLink> : null}
            {isAdmin ? <NavLink to="/auditoria" className={linkClass}>Auditoria</NavLink> : null}
            <NavLink to="/perfil" className={linkClass}>Mi perfil</NavLink>
            {isAdmin ? <NavLink to="/configuracion" className={linkClass}>Configuracion</NavLink> : null}
            <NavLink to="/kiosko" className={linkClass}>Modo kiosko</NavLink>
            <button type="button" className="btn btn-ghost justify-center" onClick={handleLogout}>Cerrar sesion</button>
          </nav>
        </aside>
        <main className="min-w-0"><Outlet /></main>
      </div>
    </div>
  );
}