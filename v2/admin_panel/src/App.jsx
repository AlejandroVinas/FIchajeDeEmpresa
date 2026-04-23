import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout        from './components/Layout';
import LoginPage     from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmpleadosPage from './pages/EmpleadosPage';
import FichajesPage  from './pages/FichajesPage';

// Guard: redirige al login si no hay sesión activa
function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index            element={<DashboardPage />} />
        <Route path="empleados" element={<EmpleadosPage />} />
        <Route path="fichajes"  element={<FichajesPage />} />
        {/* Ruta fallback */}
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
