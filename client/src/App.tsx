import { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import MainLayout from './components/MainLayout'
import Login from './components/Login'
import ErrorBoundary from './components/ErrorBoundary'

// Code Splitting: Carga diferida de módulos para reducir bundle inicial
const FinanceDashboard = lazy(() => import('./components/FinanceDashboard'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const MembersView = lazy(() => import('./components/MembersView'))
const UsersView = lazy(() => import('./components/UsersView'))
const ProfileView = lazy(() => import('./components/ProfileView'))
const TeamView = lazy(() => import('./components/TeamView'))
const EventsView = lazy(() => import('./components/EventsView'))
const BaptismsView = lazy(() => import('./components/BaptismsView'))

function ModuleSkeleton() {
  return (
    <div className="w-full space-y-4 animate-pulse pt-2">
      <div className="h-24 bg-white/70 rounded-3xl border border-white/60 shadow-2xs"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-32 bg-white/60 rounded-2xl border border-white/50"></div>
        <div className="h-32 bg-white/60 rounded-2xl border border-white/50"></div>
        <div className="h-32 bg-white/60 rounded-2xl border border-white/50"></div>
      </div>
      <div className="h-64 bg-white/70 rounded-3xl border border-white/60"></div>
    </div>
  )
}

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getDefaultModule = (user: any): string => {
  if (!user || user.rol === 'admin') return 'finanzas';
  const perms = user.permisos || {};
  if (perms.finanzas && perms.finanzas !== 'ninguno') return 'finanzas';
  const order = ['agenda', 'miembros', 'bautismos', 'equipo', 'eventos', 'usuarios', 'perfil'];
  const found = order.find(m => m === 'perfil' || (perms[m] && perms[m] !== 'ninguno'));
  return found || 'perfil';
};

interface ProtectedRouteProps {
  module?: string;
  children: React.ReactNode;
}

function ProtectedRoute({ module, children }: ProtectedRouteProps) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const user = getUser();

  if (module && module !== 'perfil') {
    if (user.rol !== 'admin') {
      if (module === 'usuarios') {
        return <Navigate to={`/${getDefaultModule(user)}`} replace />;
      }
      const perms = user.permisos || {};
      if (perms[module] === 'ninguno') {
        return <Navigate to={`/${getDefaultModule(user)}`} replace />;
      }
    }
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<ModuleSkeleton />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

function RootRedirect() {
  const user = getUser();
  return <Navigate to={`/${getDefaultModule(user)}`} replace />;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(localStorage.getItem('token')));
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthError = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      navigate('/login', { replace: true });
    };

    window.addEventListener('auth_error', handleAuthError);
    return () => window.removeEventListener('auth_error', handleAuthError);
  }, [navigate]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    const user = getUser();
    window.dispatchEvent(new Event('user_updated'));
    const from = (location.state as any)?.from?.pathname || `/${getDefaultModule(user)}`;
    navigate(from, { replace: true });
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <Navigate to={`/${getDefaultModule(getUser())}`} replace />
          ) : (
            <Login onLoginSuccess={handleLoginSuccess} />
          )
        }
      />

      <Route
        element={
          isAuthenticated ? (
            <MainLayout>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="w-full"
              >
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </motion.div>
            </MainLayout>
          ) : (
            <Navigate to="/login" state={{ from: location }} replace />
          )
        }
      >
        <Route index element={<RootRedirect />} />
        <Route path="/finanzas" element={<ProtectedRoute module="finanzas"><FinanceDashboard /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute module="agenda"><CalendarView /></ProtectedRoute>} />
        <Route path="/miembros" element={<ProtectedRoute module="miembros"><MembersView /></ProtectedRoute>} />
        <Route path="/bautismos" element={<ProtectedRoute module="bautismos"><BaptismsView /></ProtectedRoute>} />
        <Route path="/equipo" element={<ProtectedRoute module="equipo"><TeamView /></ProtectedRoute>} />
        <Route path="/eventos" element={<ProtectedRoute module="eventos"><EventsView /></ProtectedRoute>} />
        <Route path="/usuarios" element={<ProtectedRoute module="usuarios"><UsersView /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute module="perfil"><ProfileView /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
