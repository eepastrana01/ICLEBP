import React, { useState, useEffect } from 'react';
import api from '../lib/api';

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('saved_username');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

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

      if (rememberMe) {
        localStorage.setItem('saved_username', username.trim());
      } else {
        localStorage.removeItem('saved_username');
      }
      
      onLoginSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Credenciales incorrectas. Verifica tu usuario y contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans selection:bg-slate-900 selection:text-white relative overflow-hidden">
      {/* Ambient background light gradients */}
      <div className="fixed -top-40 -left-40 w-[32rem] h-[32rem] rounded-full bg-blue-400/15 blur-[130px] pointer-events-none" />
      <div className="fixed top-1/3 left-1/4 w-[24rem] h-[24rem] rounded-full bg-slate-300/20 blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-emerald-400/15 blur-[130px] pointer-events-none" />
      
      {/* Decorative Pastoral Bento Showcase (Desktop Only) */}
      <div className="relative hidden w-0 flex-1 lg:flex flex-col justify-between bg-slate-950 p-12 xl:p-16 text-white overflow-hidden">
        {/* Subtle glow effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-blue-600/20 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none" />
        
        {/* Dot pattern overlay */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{ 
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1.2px, transparent 1.2px)', 
            backgroundSize: '28px 28px' 
          }}
        />

        {/* Top Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase">
              Sistema Pastoral ICLEB • Activo
            </span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white mb-5 leading-[1.15]">
            Administra tu<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-blue-200">
              congregación
            </span><br/>
            con excelencia.
          </h1>
          <p className="text-sm xl:text-base text-slate-400 max-w-lg leading-relaxed">
            Plataforma integral para la gestión de finanzas, actividades, rifas, miembros y equipos pastorales en un solo lugar seguro y transparente.
          </p>
        </div>

        {/* Bento Micro-Cards Showcase */}
        <div className="relative z-10 my-8 space-y-3 max-w-lg">
          {/* Card 1: Finanzas */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md transition-all hover:bg-white/[0.08]">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white truncate">Finanzas Claras</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">Talonarios Válidos</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">Control de ingresos, egresos y recibos con correlativo automático.</p>
            </div>
          </div>

          {/* Card 2: Rifas y Eventos */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md transition-all hover:bg-white/[0.08]">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white truncate">Rifas & Actividades</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Metas en Vivo</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">Seguimiento en vivo de boletos asignados, pagados y entregados.</p>
            </div>
          </div>

          {/* Card 3: Comunidad y Agenda */}
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.05] border border-white/[0.08] backdrop-blur-md transition-all hover:bg-white/[0.08]">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white truncate">Comunidad & Miembros</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">Padrón Activo</span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">Directorio eclesial, sacramentos y cronograma pastoral unificado.</p>
            </div>
          </div>
        </div>

        {/* Bottom Security Info */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
          </svg>
          <span>Acceso seguro protegido con cifrado SSL & JWT</span>
        </div>
      </div>

      {/* Form Side - Bento Glassmorphism Card */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8 lg:px-12 xl:px-16 relative z-10">
        <div className="mx-auto w-full max-w-md">
          
          <div className="glass-panel-elevated p-7 sm:p-9 rounded-[2.25rem] border border-white/80 shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            
            {/* Logo and Welcome Branding */}
            <div className="mb-7 text-center sm:text-left">
              <div className="inline-flex p-3 rounded-2xl bg-white/95 shadow-sm border border-white/90 mb-5">
                <img src="/LogoICLEB.svg" alt="Logo ICLEB" className="h-11 sm:h-12 w-auto object-contain" />
              </div>
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                  ICLEB • El Buen Pastor
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                Iniciar Sesión
              </h2>
              <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
                Ingresa tus credenciales para acceder al sistema.
              </p>
            </div>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Error Banner with Shake Animation */}
              {error && (
                <div className="animate-shake rounded-2xl bg-rose-50/90 p-3.5 border border-rose-200/80 flex items-start gap-2.5">
                  <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p className="text-xs font-bold text-rose-800 leading-snug">{error}</p>
                </div>
              )}

              {/* Username Field with Icon */}
              <div>
                <label htmlFor="username" className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Usuario
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input block w-full rounded-2xl pl-10 pr-4 py-3 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                    placeholder="Ej. admin"
                  />
                </div>
              </div>

              {/* Password Field with Left Lock and Right Toggle Eye */}
              <div>
                <label htmlFor="password" className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="glass-input block w-full rounded-2xl pl-10 pr-11 py-3 text-base sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Username Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-slate-300 text-slate-900 focus:ring-slate-900/20 cursor-pointer accent-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-600">
                    Recordar mi usuario
                  </span>
                </label>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 px-5 text-sm font-bold text-white transition-all shadow-[0_4px_16px_rgba(15,23,42,0.16)] hover:shadow-lg active:scale-[0.99] disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-white/70" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <span>Ingresar al sistema</span>
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center border-t border-slate-200/60 pt-4">
              <p className="text-[11px] font-semibold text-slate-400">
                Planner Pastoral &copy; {new Date().getFullYear()} • ICLEB
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
