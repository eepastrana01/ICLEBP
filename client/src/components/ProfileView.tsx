import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { SPRING_FAST } from '../lib/animations';

interface ProfileData {
  id: number;
  username: string;
  rol: string;
  activo: boolean;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
}

interface FormState {
  password: string;
  correo: string;
  telefono: string;
  direccion: string;
}

export default function ProfileView() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    password: '',
    correo: '',
    telefono: '',
    direccion: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['perfil'],
    queryFn: () => api.get('/usuarios/perfil').then(res => res.data),
  });

  useEffect(() => {
    if (profile) {
      setForm({
        password: '',
        correo: profile.correo || '',
        telefono: profile.telefono || '',
        direccion: profile.direccion || ''
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: FormState) => api.put('/usuarios/perfil', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['perfil'] });
      setStatusMsg({ type: 'success', text: 'Perfil actualizado correctamente' });
      if (res.data.user) localStorage.setItem('user', JSON.stringify(res.data.user));
      if (res.data.token) localStorage.setItem('token', res.data.token);
      window.dispatchEvent(new Event('user_updated'));
      setForm(prev => ({ ...prev, password: '' }));
      setTimeout(() => setStatusMsg(null), 4000);
    },
    onError: (err: any) => {
      const errorText = err.response?.data?.error || 'Error al actualizar el perfil';
      setStatusMsg({ type: 'error', text: errorText });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return <div className="py-20 text-center text-xs font-semibold text-slate-400">Cargando perfil...</div>;
  }

  const initials = profile?.username ? profile.username.substring(0, 2).toUpperCase() : 'US';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">

      {/* Header */}
      <motion.div 
        whileHover={{ y: -2 }}
        transition={SPRING_FAST}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-[2rem] p-6 sm:p-8"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-[0_8px_20px_rgba(15,23,42,0.25)] border border-slate-700 shrink-0">
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{profile?.username}</h1>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${profile?.rol === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {profile?.rol === 'admin' ? 'Administrador' : 'Pastoral / Usuario'}
              </span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">Gestiona tu contrasena y datos de contacto opcionales.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <span className="text-xs font-extrabold text-slate-700">Cuenta Activa</span>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${statusMsg.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' : 'bg-rose-50/90 border-rose-200 text-rose-800'}`}
          >
            <div className="flex items-center gap-2.5">
              <span>{statusMsg.type === 'success' ? 'OK' : 'Error'}</span>
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700">X</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1 Credenciales */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.008 }}
          transition={SPRING_FAST}
          className="glass-panel rounded-[2rem] p-6 sm:p-7 flex flex-col justify-between space-y-5 border border-white/80"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Credenciales de Acceso</h3>
                <p className="text-xs font-medium text-slate-400">Usuario fijo, solo puedes cambiar tu contrasena</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Username readonly */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Nombre de Usuario</label>
                <div className="relative">
                  <div className="w-full rounded-2xl px-4 py-3 text-xs font-bold text-slate-500 pl-10 pr-10 bg-slate-50/80 border border-slate-200/80 select-none flex items-center min-h-[42px]">
                    {profile?.username}
                  </div>
                  <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div className="absolute right-3.5 top-3 text-slate-300 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-1">El nombre de usuario no puede ser modificado.</p>
              </div>
              {/* Password */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Nueva Contrasena</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="glass-input w-full rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none pl-10 pr-10"
                    placeholder="(dejar en blanco para no cambiar)"
                  />
                  <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 transition-colors">
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-medium text-slate-400 mt-1">Minimo 4 caracteres. Solo completa si deseas cambiar tu clave.</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100/80">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">Contrasena protegida con bcrypt</span>
          </div>
        </motion.div>

        {/* Card 2 Info Personal */}
        <motion.div 
          whileHover={{ y: -4, scale: 1.008 }}
          transition={SPRING_FAST}
          className="glass-panel rounded-[2rem] p-6 sm:p-7 flex flex-col justify-between space-y-5 border border-white/80"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Informacion Personal</h3>
                <p className="text-xs font-medium text-slate-400">Datos de contacto opcionales</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Correo */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Correo Electronico <span className="font-normal normal-case">(opcional)</span></label>
                <div className="relative">
                  <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none pl-10" placeholder="ejemplo@correo.com" />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                </div>
              </div>
              {/* Telefono */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Telefono / WhatsApp <span className="font-normal normal-case">(opcional)</span></label>
                <div className="relative">
                  <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none pl-10" placeholder="+502 5555-4444" />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  </div>
                </div>
              </div>
              {/* Direccion */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">Direccion de Residencia <span className="font-normal normal-case">(opcional)</span></label>
                <div className="relative">
                  <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none pl-10" placeholder="Ciudad, Zona o Direccion pastoral..." />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100/80 flex items-center justify-end">
            <motion.button
              type="submit"
              disabled={updateMutation.isPending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-[0_4px_14px_rgba(15,23,42,0.2)] hover:bg-slate-800 transition-all disabled:opacity-60 cursor-pointer"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </motion.button>
          </div>
        </motion.div>

      </form>
    </div>
  );
}
