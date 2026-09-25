import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface MainLayoutProps {
  children: React.ReactNode;
  activeModule: string;
  onNavigate: (module: string) => void;
}

export default function MainLayout({ children, activeModule, onNavigate }: MainLayoutProps) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleUserUpdated = () => {
      setUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('user_updated', handleUserUpdated);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('user_updated', handleUserUpdated);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const allNavItems = [
    { id: 'finanzas', label: 'Finanzas', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
    { id: 'agenda', label: 'Agenda Pastoral', icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z' },
    { id: 'miembros', label: 'Miembros', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { id: 'bautismos', label: 'Fe de Bautismo', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { id: 'equipo', label: 'Equipo Pastoral', icon: 'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M6 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 8v4 M12 12l-6 4 M12 12l6 4' },
    { id: 'eventos', label: 'Rifas & Eventos', icon: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z M13 5v2 M13 11v2 M13 17v2' },
    { id: 'usuarios', label: 'Usuarios', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
    { id: 'perfil', label: 'Mi Perfil', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' }
  ];

  const navItems = allNavItems.filter((item) => {
    if (user.rol === 'admin') return true;
    if (item.id === 'perfil') return true;
    const permisos = user.permisos || {};
    const modPerm = permisos[item.id];
    if (modPerm !== undefined) {
      return modPerm !== 'ninguno';
    }
    if (item.id === 'usuarios') return user.rol === 'admin';
    return true;
  });

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen md:overflow-hidden bg-[#F4F6F8] font-sans text-slate-900 relative selection:bg-slate-900 selection:text-white">
      {/* Ambient background light gradients for Glassmorphism refraction (solo en desktop) */}
      <div className="hidden md:block fixed -top-32 -left-32 w-96 h-96 rounded-full bg-blue-400/10 blur-[110px] pointer-events-none" />
      <div className="hidden md:block fixed top-1/2 left-1/3 w-80 h-80 rounded-full bg-slate-300/10 blur-[120px] pointer-events-none" />
      <div className="hidden md:block fixed -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-[110px] pointer-events-none" />

      {/* Sidebar Desktop - Glassmorphism SaaS Panel */}
      <aside className="hidden md:flex w-72 flex-col shrink-0 p-4 relative z-20">
        <div className="flex flex-col h-full glass-panel rounded-[2rem] overflow-hidden">
          
          {/* Brand Header */}
          <div className="flex h-24 items-center px-7 border-b border-white/60">
            <div className="p-2 rounded-2xl bg-white/70 shadow-sm border border-white/80 shrink-0">
              <img src="/LogoICLEB.svg" alt="Logo ICLEB" className="h-8 w-auto object-contain" />
            </div>
            <div className="ml-3.5">
              <span className="block text-base font-extrabold tracking-tight text-slate-900 leading-tight">Planner</span>
              <span className="block text-[10px] font-extrabold tracking-widest text-slate-400 uppercase leading-tight mt-0.5">Pastoral</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3.5 py-6 overflow-y-auto custom-scrollbar">
            <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Menú Principal</p>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`group flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      isActive 
                        ? 'bg-slate-900 text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)]' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round" 
                      className={`mr-3.5 h-4.5 w-4.5 transition-transform duration-200 ${isActive ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-900 group-hover:scale-105'}`}
                    >
                      <path d={item.icon}></path>
                    </svg>
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
          
          {/* User Footer */}
          <div className="p-3.5 mt-auto border-t border-white/60">
            <div className="glass-panel-subtle rounded-2xl p-3.5 flex flex-col gap-3">
              <button 
                onClick={() => onNavigate('perfil')}
                className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white shadow-sm border border-slate-700 flex items-center justify-center font-extrabold text-xs shrink-0 group-hover:scale-105 transition-transform">
                  {user.username?.substring(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate leading-tight group-hover:text-indigo-600 transition-colors">{user.username || 'Usuario'}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 leading-tight">{user.rol || 'Rol'}</p>
                </div>
              </button>
              
              <button 
                onClick={() => onNavigate('login')}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white/70 hover:bg-rose-50 px-3 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors border border-white shadow-xs cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Slide-in Drawer via React Portal con aceleración por hardware nativa */}
      {mounted && createPortal(
        <div 
          className={`fixed inset-0 z-[100] flex md:hidden transition-opacity duration-200 ${
            isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!isSidebarOpen}
        >
          {/* Backdrop (Cero blur para evitar congelamientos en WebKit/Safari) */}
          <div 
            className="fixed inset-0 bg-slate-950/40"
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer Panel con GPU transform nativo */}
          <div 
            className={`relative flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl h-full rounded-r-[2rem] overflow-hidden z-10 transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Drawer Header */}
            <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <img src="/LogoICLEB.svg" alt="Logo ICLEB" className="h-8 w-auto object-contain" />
                <div>
                  <span className="block text-base font-extrabold tracking-tight text-slate-900 leading-tight">Planner</span>
                  <span className="block text-[10px] font-extrabold tracking-widest text-slate-400 uppercase leading-tight mt-0.5">Pastoral</span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 active:bg-slate-100 transition-colors cursor-pointer touch-manipulation select-none"
                aria-label="Cerrar menú"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Drawer Nav Items */}
            <div className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar bg-white">
              <p className="px-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3">Módulos</p>
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { 
                        setSidebarOpen(false);
                        onNavigate(item.id); 
                      }}
                      className={`flex w-full items-center rounded-2xl px-4 py-3 text-sm font-semibold transition-colors duration-150 cursor-pointer touch-manipulation select-none ${
                        isActive 
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10' 
                          : 'text-slate-600 hover:bg-slate-100 active:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round" className="mr-3.5 h-5 w-5">
                        <path d={item.icon}></path>
                      </svg>
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Drawer User Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/90 shrink-0">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2.5 shadow-2xs">
                <button 
                  type="button"
                  onClick={() => { setSidebarOpen(false); onNavigate('perfil'); }}
                  className="flex items-center gap-3 text-left hover:opacity-85 transition-opacity cursor-pointer group touch-manipulation select-none"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white shadow-xs border border-slate-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {user.username?.substring(0, 2).toUpperCase() || 'US'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate leading-tight group-hover:text-indigo-600">{user.username || 'Usuario'}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 leading-tight">{user.rol || 'Rol'}</p>
                  </div>
                </button>
                <button 
                  type="button"
                  onClick={() => { setSidebarOpen(false); onNavigate('login'); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 hover:bg-rose-50 active:bg-rose-100 px-3 py-2 text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors border border-slate-200 shadow-2xs cursor-pointer touch-manipulation select-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-h-screen md:min-h-0 md:overflow-hidden relative z-10">
        
        {/* Mobile Compact Navbar pegajosa (Sticky) que se integra bajo la barra de estado de Safari */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-4 sm:px-6 md:hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-50 shadow-2xs border border-slate-200/60">
              <img src="/LogoICLEB.svg" alt="Logo" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <span className="text-sm font-extrabold text-slate-900 tracking-tight block leading-tight">Planner Pastoral</span>
              <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block leading-tight">ICLEB</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onNavigate('perfil')}
              className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-xs shadow-2xs cursor-pointer active:scale-95 transition-transform"
              title="Mi Perfil"
            >
              {user.username?.substring(0, 2).toUpperCase() || 'US'}
            </button>
            <button 
              type="button"
              onClick={() => setSidebarOpen(true)} 
              style={{ touchAction: 'manipulation' }}
              className="w-9 h-9 flex items-center justify-center text-slate-700 bg-slate-50 active:bg-slate-100 rounded-xl shadow-xs border border-slate-200/60 active:scale-95 transition-all cursor-pointer touch-manipulation select-none"
              aria-label="Abrir menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </header>

        {/* Scrollable Content Container (con espacio inferior amplio pb-32 para fluir detrás de la barra flotante y Safari) */}
        <main className="flex-1 md:overflow-y-auto relative z-10 custom-scrollbar p-3.5 sm:p-5 md:p-6 lg:p-8 pb-32 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar (Barra flotante estilo AppFinanzas, sobre la barra de Safari) */}
        <div className="fixed bottom-4 left-4 right-4 z-40 md:hidden">
          <nav className="flex items-center bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.10)] px-2 py-1.5 gap-1 border border-slate-200/80">
            {navItems.slice(0, 4).map((item) => {
              const isActive = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`relative flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-150 cursor-pointer flex-1 touch-manipulation select-none ${
                    isActive ? 'text-slate-900 font-extrabold' : 'text-slate-400 hover:text-slate-700 font-medium'
                  }`}
                >
                  {isActive && (
                    <div
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-white/80"
                    />
                  )}
                  <span className="relative z-10 flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 mb-0.5">
                      <path d={item.icon}></path>
                    </svg>
                    <span className="text-[10px] leading-tight truncate max-w-[64px]">{item.label.split(' ')[0]}</span>
                  </span>
                </button>
              );
            })}
            
            {/* Botón de Menú Completo para abrir el Drawer */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              style={{ touchAction: 'manipulation' }}
              className="flex flex-col items-center justify-center py-2 px-3 rounded-xl text-slate-400 hover:text-slate-700 active:text-slate-900 font-medium transition-colors cursor-pointer flex-1 touch-manipulation select-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 mb-0.5">
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
              </svg>
              <span className="text-[10px] leading-tight">Más</span>
            </button>
          </nav>
        </div>

      </div>
    </div>
  );
}
