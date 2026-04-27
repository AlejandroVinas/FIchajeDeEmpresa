import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmpleadosPage from './pages/EmpleadosPage';
import FichajesPage from './pages/FichajesPage';
import ConfiguracionPage from './pages/ConfiguracionPage';
import IncidenciasPage from './pages/IncidenciasPage';
import CalendarioPage from './pages/CalendarioPage';
import BackupsPage from './pages/BackupsPage';
import AuditoriaPage from './pages/AuditoriaPage';
import PerfilPage from './pages/PerfilPage';
import KioskoPage from './pages/KioskoPage';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/kiosko" element={<KioskoPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="empleados" element={<RequireRole roles={['admin']}><EmpleadosPage /></RequireRole>} />
        <Route path="fichajes" element={<FichajesPage />} />
        <Route path="incidencias" element={<IncidenciasPage />} />
        <Route path="calendario" element={<RequireRole roles={['admin', 'supervisor']}><CalendarioPage /></RequireRole>} />
        <Route path="backups" element={<RequireRole roles={['admin']}><BackupsPage /></RequireRole>} />
        <Route path="auditoria" element={<RequireRole roles={['admin']}><AuditoriaPage /></RequireRole>} />
        <Route path="perfil" element={<PerfilPage />} />
        <Route path="configuracion" element={<RequireRole roles={['admin']}><ConfiguracionPage /></RequireRole>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}