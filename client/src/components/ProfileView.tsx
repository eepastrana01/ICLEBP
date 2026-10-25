import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { SPRING_FAST } from '../lib/animations';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Lock,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';

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
  const navigate = useNavigate();
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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs"
      >
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-sm border border-slate-700 shrink-0">
            {initials}
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Mi Cuenta • ICLEB
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{profile?.username}</h1>
              <Badge variant={profile?.rol === 'admin' ? 'purple' : 'success'} className="text-[10px] font-black uppercase tracking-wider">
                {profile?.rol === 'admin' ? 'Administrador' : 'Pastoral / Usuario'}
              </Badge>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">Gestiona tu contraseña y datos de contacto institucionales.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Badge variant="success" className="text-xs font-bold gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Cuenta Activa</span>
          </Badge>
        </div>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between shadow-xs ${statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}
          >
            <div className="flex items-center gap-2.5">
              {statusMsg.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{statusMsg.text}</span>
            </div>
            <button onClick={() => setStatusMsg(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1 Credenciales */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={SPRING_FAST}
          className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 border border-slate-200/80 shadow-2xs"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Credenciales de Acceso</h3>
                <p className="text-xs font-medium text-slate-400">Usuario fijo, solo puedes cambiar tu contraseña</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Username readonly */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nombre de Usuario</label>
                <div className="relative">
                  <div className="w-full h-10 rounded-xl px-4 py-2 text-xs font-bold text-slate-500 pl-10 pr-10 bg-slate-50 border border-slate-200 select-none flex items-center shadow-2xs">
                    {profile?.username}
                  </div>
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="absolute right-3.5 top-3 text-slate-300 pointer-events-none">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-slate-400 mt-1">El nombre de usuario no puede ser modificado.</p>
              </div>
              {/* Password */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs pl-10 pr-10"
                    placeholder="(dejar en blanco para no cambiar)"
                  />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <Lock className="w-4 h-4" />
                  </div>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-medium text-slate-400 mt-1">Mínimo 4 caracteres. Solo completa si deseas cambiar tu clave.</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">Contraseña protegida con bcrypt</span>
          </div>
        </motion.div>

        {/* Card 2 Info Personal */}
        <motion.div 
          whileHover={{ y: -2 }}
          transition={SPRING_FAST}
          className="bg-white rounded-3xl p-6 sm:p-7 flex flex-col justify-between space-y-5 border border-slate-200/80 shadow-2xs"
        >
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Información de Contacto</h3>
                <p className="text-xs font-medium text-slate-400">Datos opcionales para la congregación</p>
              </div>
            </div>
            <div className="space-y-4">
              {/* Correo */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Correo Electrónico <span className="font-normal normal-case">(opcional)</span></label>
                <div className="relative">
                  <input type="email" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs pl-10" placeholder="ejemplo@correo.com" />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                </div>
              </div>
              {/* Telefono */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Teléfono / WhatsApp <span className="font-normal normal-case">(opcional)</span></label>
                <div className="relative">
                  <input type="text" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs pl-10" placeholder="+504 9999-9999" />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <Phone className="w-4 h-4" />
                  </div>
                </div>
              </div>
              {/* Direccion */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Dirección de Residencia <span className="font-normal normal-case">(opcional)</span></label>
                <div className="relative">
                  <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs pl-10" placeholder="San Pedro Sula, Cortés..." />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>
        </motion.div>

      </form>

      {/* Sección Informativa: App Info & Autor */}
      <motion.div
        whileHover={{ y: -2 }}
        transition={SPRING_FAST}
        className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
            EP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">Planner Pastoral ICLEB • v2.4</h3>
              <Badge variant="purple" className="text-[10px] font-black">
                App Info
              </Badge>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Desarrollado y creado por <strong className="text-slate-800">Edis Pastrana</strong>. Consulta el stack técnico, arquitectura y repositorio.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => navigate('/info')}
          className="gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shrink-0"
        >
          <Info className="w-4 h-4" />
          <span>Ver App Info</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </motion.div>
    </div>
  );
}
