import { useState, useMemo, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';

interface PermisosModulos {
  finanzas?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  agenda?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  miembros?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  equipo?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  eventos?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  usuarios?: 'ninguno' | 'lectura' | 'admin';
}

interface Usuario {
  id: number;
  username: string;
  nombre_completo?: string | null;
  rol: string;
  activo: boolean;
  password_plain?: string | null;
  permisos?: PermisosModulos | null;
  correo?: string | null;
  telefono?: string | null;
  direccion?: string | null;
}

// Presets por rol para facilitar configuración instantánea
const ROL_PRESETS: Record<string, { label: string; permisos: PermisosModulos }> = {
  admin: {
    label: 'Administrador (Control Total)',
    permisos: { finanzas: 'admin', agenda: 'admin', miembros: 'admin', equipo: 'admin', eventos: 'admin', usuarios: 'admin' }
  },
  pastor: {
    label: 'Pastor / Dirección (Vista General & Agenda)',
    permisos: { finanzas: 'lectura', agenda: 'escritura', miembros: 'lectura', equipo: 'lectura', eventos: 'lectura', usuarios: 'ninguno' }
  },
  secretaria: {
    label: 'Secretaría (Agenda, Miembros, Equipo & Usuarios)',
    permisos: { finanzas: 'ninguno', agenda: 'escritura', miembros: 'escritura', equipo: 'escritura', eventos: 'escritura', usuarios: 'lectura' }
  },
  tesorera: {
    label: 'Tesorería (Gestión Financiera)',
    permisos: { finanzas: 'escritura', agenda: 'lectura', miembros: 'lectura', equipo: 'lectura', eventos: 'escritura', usuarios: 'ninguno' }
  },
  fiscal: {
    label: 'Fiscal / Auditoría (Supervisión & Lectura)',
    permisos: { finanzas: 'lectura', agenda: 'lectura', miembros: 'lectura', equipo: 'lectura', eventos: 'lectura', usuarios: 'ninguno' }
  },
  lider: {
    label: 'Líder / Coordinador de Ministerio',
    permisos: { finanzas: 'ninguno', agenda: 'escritura', miembros: 'lectura', equipo: 'lectura', eventos: 'escritura', usuarios: 'ninguno' }
  },
  invitado: {
    label: 'Invitado / Solo Lectura Básica',
    permisos: { finanzas: 'ninguno', agenda: 'lectura', miembros: 'lectura', equipo: 'lectura', eventos: 'ninguno', usuarios: 'ninguno' }
  }
};

const MODULOS_INFO = [
  { key: 'finanzas', label: 'Finanzas', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
  { key: 'agenda', label: 'Agenda Pastoral', icon: 'M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10z' },
  { key: 'miembros', label: 'Miembros', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
  { key: 'equipo', label: 'Equipo Pastoral', icon: 'M12 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M6 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M18 16a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
  { key: 'eventos', label: 'Rifas & Eventos', icon: 'M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z M13 5v2 M13 11v2 M13 17v2' },
  { key: 'usuarios', label: 'Usuarios & Permisos', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }
] as const;

export default function UsersView() {
  const queryClient = useQueryClient();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = currentUser.rol === 'admin';
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Estados de visibilidad de contraseñas por ID de usuario
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    nombre_completo: '',
    password: '',
    rol: 'lider',
    permisos: ROL_PRESETS.lider.permisos as PermisosModulos
  });
  const [formError, setFormError] = useState('');

  const { data: usuarios = [], isLoading } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/usuarios')).data,
    enabled: isAdmin,
  });

  const total = usuarios.length;
  const activos = usuarios.filter(u => u.activo).length;
  const admins = usuarios.filter(u => u.rol === 'admin').length;

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return usuarios;
    return usuarios.filter(u =>
      u.username.toLowerCase().includes(q) ||
      (u.nombre_completo && u.nombre_completo.toLowerCase().includes(q)) ||
      u.rol.toLowerCase().includes(q)
    );
  }, [usuarios, searchTerm]);

  // Alternar visibilidad de contraseña
  const togglePasswordVisibility = (id: number) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyPassword = (id: number, pass?: string | null) => {
    if (!pass) return;
    navigator.clipboard.writeText(pass);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Abrir Modal de Creación
  const openCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      nombre_completo: '',
      password: '',
      rol: 'lider',
      permisos: { ...ROL_PRESETS.lider.permisos }
    });
    setFormError('');
    setShowModal(true);
  };

  // Abrir Modal de Edición Completa
  const openEdit = (u: Usuario) => {
    setEditingUser(u);
    const initialPerms = u.permisos && typeof u.permisos === 'object'
      ? { ...u.permisos }
      : (ROL_PRESETS[u.rol]?.permisos || { ...ROL_PRESETS.invitado.permisos });

    setFormData({
      username: u.username,
      nombre_completo: u.nombre_completo || '',
      password: u.password_plain || '',
      rol: u.rol,
      permisos: initialPerms
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormError('');
  };

  // Al cambiar de Rol en el Formulario, aplicar Preset automáticamente
  const handleRoleChange = (newRole: string) => {
    const preset = ROL_PRESETS[newRole]?.permisos || ROL_PRESETS.invitado.permisos;
    setFormData(prev => ({
      ...prev,
      rol: newRole,
      permisos: { ...preset }
    }));
  };

  // Mutaciones
  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingUser) {
        return api.put(`/usuarios/${editingUser.id}/editar`, data);
      }
      return api.post('/usuarios', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'No se pudo guardar el usuario.');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.put(`/usuarios/${id}/estado`, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/usuarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['usuarios'] })
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim()) {
      setFormError('El nombre de usuario es obligatorio.');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 4)) {
      setFormError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    saveMutation.mutate(formData);
  };

  if (!isAdmin) {
    return (
      <div className="pb-12 flex flex-col items-center justify-center h-[calc(100vh-140px)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={SPRING_SNAPPY}
          className="glass-panel-elevated p-9 rounded-[2rem] text-center max-w-sm w-full shadow-lg"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-5 text-rose-500 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Acceso Restringido</h2>
          <p className="text-xs font-medium text-slate-500 mt-1.5 leading-relaxed">
            Esta sección es exclusiva para administradores. Contacta al equipo pastoral si requieres permisos.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-16 font-sans text-slate-900">

      {/* ========== TOPBAR ========== */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Control de Accesos &bull; ICLEB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Administración de Usuarios y Permisos
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Gestión de credenciales, visualización de contraseñas y permisos por módulo.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING_FAST}
          onClick={openCreate}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-[0_4px_14px_rgba(15,23,42,0.18)] cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Usuario
        </motion.button>
      </div>

      {/* ========== METRIC CARDS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <motion.div whileHover={{ y: -2, scale: 1.008 }} transition={SPRING_FAST} className="glass-panel rounded-[1.75rem] p-5 sm:p-6 flex items-center justify-between cursor-default">
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Usuarios</p>
            <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 mt-1">{total}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Cuentas creadas</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2, scale: 1.008 }} transition={SPRING_FAST} className="glass-panel rounded-[1.75rem] p-5 sm:p-6 flex items-center justify-between cursor-default">
          <div>
            <p className="text-[10px] font-extrabold text-purple-600 uppercase tracking-widest">Administradores</p>
            <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 mt-1">{admins}</p>
            <p className="text-[11px] font-bold text-purple-600 mt-0.5">Control total</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -2, scale: 1.008 }} transition={SPRING_FAST} className="glass-panel rounded-[1.75rem] p-5 sm:p-6 flex items-center justify-between cursor-default">
          <div>
            <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Cuentas Activas</p>
            <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 mt-1">{activos} <span className="text-xs font-bold text-slate-400">/ {total}</span></p>
            <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{total > 0 ? Math.round((activos / total) * 100) : 0}% habilitadas</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </motion.div>
      </div>

      {/* ========== TABLA DE USUARIOS & PERMISOS ========== */}
      <div className="glass-panel rounded-[2rem] overflow-hidden">
        
        {/* Barra superior de búsqueda */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-white/60 gap-3.5">
          <div className="relative flex-1 max-w-none sm:max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar usuario o nombre..."
              className="glass-input w-full rounded-2xl pl-10 pr-4 py-2 text-xs font-semibold focus:outline-none"
            />
            <div className="absolute left-3.5 top-2.5 text-slate-400 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">
                ✕
              </button>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500">
            Mostrando <span className="font-bold text-slate-900">{filteredUsers.length}</span> de <span className="font-bold text-slate-900">{total}</span> usuarios
          </div>
        </div>

        <div className="relative w-full overflow-x-auto custom-scrollbar p-2 sm:p-4">
          <table className="w-full text-left text-sm min-w-[720px]">
            <thead>
              <tr className="border-b border-white/60">
                <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Usuario / Nombre</th>
                <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Rol</th>
                <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Contraseña Asignada</th>
                <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Permisos de Módulos</th>
                <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-center">Estado</th>
                <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/40">
              {isLoading ? (
                <tr><td colSpan={6} className="py-20 text-center text-xs font-medium text-slate-400">Cargando directorio de usuarios...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-white/80 border border-white flex items-center justify-center mb-3 text-slate-400 shadow-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <p className="text-base font-bold text-slate-800">No se encontraron usuarios</p>
                    <p className="text-xs font-medium text-slate-400 mt-0.5">Intenta con otro término o crea uno nuevo.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPassVisible = !!visiblePasswords[u.id];
                  const plainPass = u.password_plain || '(Sin contraseña guardada)';
                  const isCurrent = currentUser.username?.toLowerCase() === u.username.toLowerCase();
                  const perms = u.permisos || {};

                  return (
                    <tr key={u.id} className="group transition-colors duration-150 hover:bg-white/70 rounded-2xl">
                      
                      {/* Usuario y Nombre Completo */}
                      <td className="px-5 py-3.5 align-middle rounded-l-2xl">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold uppercase text-xs shrink-0 shadow-2xs">
                            {u.username.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 text-xs block leading-tight">
                              {u.username}
                              {isCurrent && (
                                <span className="ml-1.5 text-[9px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                                  Tú
                                </span>
                              )}
                            </span>
                            {u.nombre_completo && (
                              <span className="text-[11px] font-medium text-slate-500 block truncate mt-0.5">
                                {u.nombre_completo}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rol */}
                      <td className="px-5 py-3.5 align-middle">
                        <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[10px] font-extrabold border uppercase tracking-wider ${
                          u.rol === 'admin'
                            ? 'bg-purple-50 text-purple-700 border-purple-200/80'
                            : u.rol === 'pastor'
                            ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                            : u.rol === 'secretaria'
                            ? 'bg-sky-50 text-sky-700 border-sky-200/80'
                            : u.rol === 'tesorera'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-slate-100 text-slate-700 border-white/60'
                        }`}>
                          {u.rol}
                        </span>
                      </td>

                      {/* Contraseña Asignada con Ojo y Copiar */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border border-white/80 shadow-2xs">
                          <span className="text-xs font-bold text-slate-800 select-all font-mono">
                            {isPassVisible ? plainPass : '••••••••'}
                          </span>
                          
                          {/* Botón Revelar Ojo */}
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title={isPassVisible ? 'Ocultar contraseña' : 'Ver contraseña asignada'}
                          >
                            {isPassVisible ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>

                          {/* Botón Copiar */}
                          {u.password_plain && (
                            <button
                              type="button"
                              onClick={() => copyPassword(u.id, u.password_plain)}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                copiedId === u.id
                                  ? 'text-emerald-600 bg-emerald-50'
                                  : 'text-slate-400 hover:text-slate-800 hover:bg-slate-100'
                              }`}
                              title="Copiar contraseña al portapapeles"
                            >
                              {copiedId === u.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Permisos de Módulos */}
                      <td className="px-5 py-3.5 align-middle">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {u.rol === 'admin' ? (
                            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                              ★ Acceso Total (Admin)
                            </span>
                          ) : (
                            MODULOS_INFO.map(mod => {
                              const perm = (perms as any)[mod.key];
                              if (!perm || perm === 'ninguno') return null;
                              return (
                                <span
                                  key={mod.key}
                                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md border ${
                                    perm === 'escritura' || perm === 'admin'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                  title={`${mod.label}: ${perm === 'escritura' ? 'Edición' : 'Lectura'}`}
                                >
                                  {mod.label.split(' ')[0]}: {perm === 'escritura' ? 'Edición' : 'Ver'}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-3.5 align-middle text-center">
                        <button
                          onClick={() => toggleStatusMutation.mutate({ id: u.id, activo: !u.activo })}
                          disabled={isCurrent}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                            u.activo
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100 disabled:opacity-50'
                              : 'bg-slate-100 text-slate-500 border-slate-200/80 hover:bg-slate-200 disabled:opacity-50'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-3.5 align-middle text-right rounded-r-2xl">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(u)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                            title="Editar usuario y permisos"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          </button>
                          <button
                            onClick={() => confirmAction('Eliminar Usuario', `¿Estás seguro de eliminar al usuario "${u.username}"? Perderá el acceso de inmediato.`, () => deleteMutation.mutate(u.id))}
                            disabled={isCurrent}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                            title="Eliminar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== MODAL DE CREACIÓN / EDICIÓN & PERMISOS ========== */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={SPRING_FAST}
              className="glass-panel-elevated rounded-[2rem] w-full max-w-lg overflow-hidden my-auto sm:my-8 shadow-2xl max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-white/70 bg-white/40 shrink-0">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {editingUser ? `Editar Usuario: ${editingUser.username}` : 'Nuevo Usuario del Sistema'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Configura credenciales y niveles de acceso a cada módulo.
                  </p>
                </div>
                <button onClick={closeModal} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-800 transition-colors cursor-pointer">
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-4 sm:space-y-5 overflow-y-auto max-h-[calc(92vh-80px)] custom-scrollbar">
                {formError && (
                  <div className="text-xs font-bold text-rose-600 bg-rose-50/90 p-3.5 rounded-2xl border border-rose-200">
                    {formError}
                  </div>
                )}

                {/* Campos Básicos: Usuario, Nombre, Rol, Contraseña */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Usuario (Case-Insensitive) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. MOrtega"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="glass-input w-full rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Mario Antonio Ortega"
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      className="glass-input w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Rol Principal &bull; Preset
                    </label>
                    <select
                      value={formData.rol}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="glass-input w-full rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                    >
                      {Object.entries(ROL_PRESETS).map(([key, info]) => (
                        <option key={key} value={key}>{info.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      {editingUser ? 'Nueva Contraseña' : 'Contraseña'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={!editingUser}
                      placeholder="Mínimo 4 caracteres..."
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="glass-input w-full rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* MATRIZ DE PERMISOS POR MÓDULO */}
                <div className="pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                      Control de Acceso por Módulo
                    </label>
                    <span className="text-[10px] font-medium text-slate-400">
                      Personaliza el nivel de cada sección
                    </span>
                  </div>

                  <div className="space-y-2 bg-white/50 p-3.5 rounded-2xl border border-white/80">
                    {MODULOS_INFO.map(mod => {
                      const currentVal = (formData.permisos as any)[mod.key] || 'ninguno';

                      return (
                        <div key={mod.key} className="flex items-center justify-between py-1 px-1 border-b border-slate-100 last:border-0 gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">{mod.label}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                permisos: { ...formData.permisos, [mod.key]: 'ninguno' }
                              })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                currentVal === 'ninguno'
                                  ? 'bg-slate-900 text-white shadow-2xs'
                                  : 'bg-white/80 text-slate-400 hover:text-slate-700'
                              }`}
                            >
                              Sin Acceso
                            </button>

                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                permisos: { ...formData.permisos, [mod.key]: 'lectura' }
                              })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                currentVal === 'lectura'
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-white/80 text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              Solo Lectura
                            </button>

                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                permisos: { ...formData.permisos, [mod.key]: mod.key === 'usuarios' ? 'admin' : 'escritura' }
                              })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                currentVal === 'escritura' || currentVal === 'admin'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-white/80 text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              {mod.key === 'usuarios' ? 'Admin Total' : 'Edición Total'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2.5 pt-3 border-t border-white/70">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="glass-button-secondary flex-1 rounded-xl text-slate-700 text-xs font-bold py-2.5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex-1 rounded-xl bg-slate-900 text-white text-xs font-bold py-2.5 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {saveMutation.isPending ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />
    </div>
  );
}
