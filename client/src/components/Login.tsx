import React, { useState } from 'react';
import api from '../lib/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/login', { username, password });
      const { token, rol, username: user, nombre_completo, permisos } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        username: user,
        rol,
        nombre_completo: nombre_completo || user,
        permisos: permisos || {}
      }));
      
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans selection:bg-slate-900 selection:text-white relative overflow-hidden">
      {/* Ambient background light gradients */}
      <div className="fixed -top-40 -left-40 w-[30rem] h-[30rem] rounded-full bg-blue-400/15 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-[30rem] h-[30rem] rounded-full bg-indigo-400/15 blur-[120px] pointer-events-none" />
      
      {/* Decorative Left Side */}
      <div className="relative hidden w-0 flex-1 lg:block bg-slate-950 overflow-hidden">
        {/* Subtle glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/15 blur-[100px]" />
        
        {/* Dot pattern overlay */}
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

        <div className="absolute inset-0 flex flex-col justify-center px-16 xl:px-24">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-semibold tracking-wider text-slate-200 uppercase">Sistema Activo</span>
            </div>
            
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white mb-6 leading-[1.15]">
              Administra tu<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400">
                congregación
              </span><br/>
              con excelencia.
            </h1>
            <p className="text-base text-slate-400 max-w-md leading-relaxed">
              Planner Pastoral te brinda las herramientas necesarias para gestionar finanzas, miembros, actividades y equipos desde un solo lugar.
            </p>
          </div>
        </div>
      </div>

      {/* Form Side with Glass Styling */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:flex-none lg:w-[480px] xl:w-[540px] relative z-10">
        <div className="mx-auto w-full max-w-sm">
          
          <div className="glass-panel-elevated p-8 sm:p-9 rounded-[2.25rem]">
            <div className="mb-8">
              <div className="p-2.5 rounded-2xl bg-white/90 shadow-xs border border-white inline-block mb-6">
                <img src="/LogoICLEB.svg" alt="Logo ICLEB" className="h-10 w-auto object-contain" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Iniciar Sesión
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl bg-rose-50/90 p-3.5 border border-rose-100 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  <p className="text-xs font-bold text-rose-800">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Usuario
                </label>
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input block w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
                  placeholder="Ej. admin"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input block w-full rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white transition-all hover:bg-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:shadow-lg disabled:opacity-70 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Verificando...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar al sistema</span>
                      <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center border-t border-white/60 pt-4">
              <p className="text-[11px] font-medium text-slate-400">
                Planner Pastoral &copy; {new Date().getFullYear()}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
