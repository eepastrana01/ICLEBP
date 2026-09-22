import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from './components/MainLayout'
import Login from './components/Login'

// Code Splitting: Carga diferida de módulos para reducir bundle inicial
const FinanceDashboard = lazy(() => import('./components/FinanceDashboard'))
const CalendarView = lazy(() => import('./components/CalendarView'))
const MembersView = lazy(() => import('./components/MembersView'))
const UsersView = lazy(() => import('./components/UsersView'))
const ProfileView = lazy(() => import('./components/ProfileView'))
const TeamView = lazy(() => import('./components/TeamView'))
const EventsView = lazy(() => import('./components/EventsView'))

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

const getDefaultModule = (user: any): string => {
  if (!user || user.rol === 'admin') return 'finanzas';
  const perms = user.permisos || {};
  if (perms.finanzas && perms.finanzas !== 'ninguno') return 'finanzas';
  const order = ['agenda', 'miembros', 'equipo', 'eventos', 'usuarios', 'perfil'];
  const found = order.find(m => m === 'perfil' || (perms[m] && perms[m] !== 'ninguno'));
  return found || 'perfil';
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [activeModule, setActiveModule] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return getDefaultModule(user);
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setActiveModule(getDefaultModule(user));
    }

    const handleAuthError = () => setIsAuthenticated(false)
    window.addEventListener('auth_error', handleAuthError)
    return () => window.removeEventListener('auth_error', handleAuthError)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsAuthenticated(false)
  }

  const handleNavigate = (module: string) => {
    if (module === 'login') {
      handleLogout()
    } else {
      setActiveModule(module)
    }
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => {
      setIsAuthenticated(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setActiveModule(getDefaultModule(user));
    }} />
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'finanzas': return <FinanceDashboard />;
      case 'agenda': return <CalendarView />;
      case 'miembros': return <MembersView />;
      case 'equipo': return <TeamView />;
      case 'eventos': return <EventsView />;
      case 'usuarios': return <UsersView />;
      case 'perfil': return <ProfileView />;
      default: return (
        <div className="flex items-center justify-center h-full text-slate-500">
          Módulo en construcción
        </div>
      );
    }
  }

  return (
    <MainLayout activeModule={activeModule} onNavigate={handleNavigate}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, transition: { duration: 0.06 } }}
          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <Suspense fallback={<ModuleSkeleton />}>
            {renderModule()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  )
}

export default App

