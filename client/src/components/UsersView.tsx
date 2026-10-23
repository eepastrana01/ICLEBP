import { useState, useMemo, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_FAST } from '../lib/animations';
import {
  Users,
  Shield,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  Search,
  Calendar,
  Wallet,
  Ticket,
  UserCheck,
  LayoutGrid,
  Table as TableIcon,
  X,
  UserX,
  Lock,
  Plus
} from 'lucide-react';

export interface PermisosModulos {
  finanzas?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  agenda?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  miembros?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  equipo?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  eventos?: 'ninguno' | 'lectura' | 'escritura' | 'admin';
  usuarios?: 'ninguno' | 'lectura' | 'admin';
}

export interface Usuario {
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

// Presets por rol
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
  { key: 'finanzas', label: 'Finanzas', short: 'Fin', icon: Wallet, desc: 'Ingresos, egresos y comprobantes' },
  { key: 'agenda', label: 'Agenda', short: 'Age', icon: Calendar, desc: 'Planificación de actividades' },
  { key: 'miembros', label: 'Miembros', short: 'Mbr', icon: Users, desc: 'Directorio y membresía' },
  { key: 'equipo', label: 'Equipo', short: 'Eqp', icon: UserCheck, desc: 'Equipo pastoral y ministerios' },
  { key: 'eventos', label: 'Rifas', short: 'Rif', icon: Ticket, desc: 'Eventos y recaudación' },
  { key: 'usuarios', label: 'Usuarios', short: 'Usr', icon: Shield, desc: 'Cuentas y permisos' }
] as const;

export default function UsersView() {
  const queryClient = useQueryClient();
  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const isAdmin = currentUser.rol === 'admin';
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'tabla' | 'tarjetas'>('tabla');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  // Visibilidad de contraseñas y copia
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
  const inactivos = total - activos;
  const admins = usuarios.filter(u => u.rol === 'admin').length;
  const pastoresCount = usuarios.filter(u => u.rol === 'pastor').length;
  const lideresCount = usuarios.filter(u => ['lider', 'secretaria', 'tesorera', 'fiscal'].includes(u.rol)).length;

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return usuarios.filter(u => {
      const matchesSearch = !q ||
        u.username.toLowerCase().includes(q) ||
        (u.nombre_completo && u.nombre_completo.toLowerCase().includes(q)) ||
        u.rol.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (roleFilter === 'todos') return true;
      if (roleFilter === 'admin') return u.rol === 'admin';
      if (roleFilter === 'pastor') return u.rol === 'pastor';
      if (roleFilter === 'lideres') return ['lider', 'secretaria', 'tesorera', 'fiscal'].includes(u.rol);
      if (roleFilter === 'inactivos') return !u.activo;
      return true;
    });
  }, [usuarios, searchTerm, roleFilter]);

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

  // Helper para nivel de permiso de un módulo
  const getPermLevel = (u: Usuario, modKey: string): 'admin' | 'escritura' | 'lectura' | 'ninguno' => {
    if (u.rol === 'admin') return 'admin';
    const val = (u.permisos as any)?.[modKey];
    if (!val || val === 'ninguno') return 'ninguno';
    return val;
  };

  const countActiveModules = (u: Usuario): number => {
    if (u.rol === 'admin') return 6;
    if (!u.permisos) return 0;
    return MODULOS_INFO.filter(m => {
      const p = (u.permisos as any)?.[m.key];
      return p && p !== 'ninguno';
    }).length;
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

  // Helper para badge de rol
  const renderRoleBadge = (rol: string) => {
    const r = rol.toLowerCase();
    let style = 'bg-slate-100 text-slate-700 border-slate-200';
    if (r === 'admin') style = 'bg-purple-50 text-purple-700 border-purple-200';
    else if (r === 'pastor') style = 'bg-amber-50 text-amber-700 border-amber-200';
    else if (r === 'secretaria') style = 'bg-sky-50 text-sky-700 border-sky-200';
    else if (r === 'tesorera') style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    else if (r === 'fiscal') style = 'bg-orange-50 text-orange-700 border-orange-200';
    else if (r === 'lider') style = 'bg-indigo-50 text-indigo-700 border-indigo-200';

    return (
      <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[10px] font-extrabold border uppercase tracking-wider ${style}`}>
        {rol}
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="pb-12 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-white p-8 rounded-3xl text-center max-w-sm w-full border border-slate-200/80 shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-500">
            <Lock className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Acceso Restringido</h2>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Esta sección es exclusiva para administradores del sistema pastoral.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full font-sans text-slate-900 space-y-6 pb-12">

      {/* ========== CABECERA PRINCIPAL ========== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-slate-200/80 shadow-2xs mb-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Seguridad & Accesos &bull; ICLEB
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Usuarios y Permisos
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Administración de credenciales, roles y matriz de permisos por módulo.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-[0_4px_14px_rgba(15,23,42,0.18)] transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* ========== TARJETAS DE MÉTRICAS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Total Cuentas
            </span>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{total}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Usuarios registrados</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
              Administradores
            </span>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">{admins}</p>
            <p className="text-[11px] font-bold text-purple-600 mt-0.5">Control y acceso total</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              Cuentas Activas
            </span>
            <p className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              {activos} <span className="text-xs font-semibold text-slate-400">/ {total}</span>
            </p>
            <p className="text-[11px] font-bold text-emerald-700 mt-0.5">
              {total > 0 ? Math.round((activos / total) * 100) : 0}% habilitadas
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <Check className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========== PANEL PRINCIPAL: FILTROS + TABLA/FICHAS ========== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        
        {/* Barra superior de controles */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario o nombre..."
              className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl pl-10 pr-9 py-2 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtros por Rol + Switch de Vista */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/60">
              <button
                onClick={() => setRoleFilter('todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'todos' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({total})
              </button>
              <button
                onClick={() => setRoleFilter('admin')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'admin' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admins ({admins})
              </button>
              <button
                onClick={() => setRoleFilter('pastor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'pastor' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pastores ({pastoresCount})
              </button>
              <button
                onClick={() => setRoleFilter('lideres')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  roleFilter === 'lideres' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Líderes ({lideresCount})
              </button>
              {inactivos > 0 && (
                <button
                  onClick={() => setRoleFilter('inactivos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    roleFilter === 'inactivos' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Inactivos ({inactivos})
                </button>
              )}
            </div>

            {/* Alternador Vista Tabla vs Tarjetas */}
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setViewMode('tabla')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'tabla' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-800'
                }`}
                title="Vista Tabla"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('tarjetas')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'tarjetas' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-400 hover:text-slate-800'
                }`}
                title="Vista Fichas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ========== CONTENIDO: VISTA TABLA ========== */}
        {viewMode === 'tabla' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm min-w-[860px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-5">Usuario / Nombre</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Contraseña</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span>Permisos de Módulos</span>
                      <span className="text-[9px] font-bold text-slate-400 lowercase">
                        (verde: edición &bull; azul: lectura)
                      </span>
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-xs font-semibold text-slate-400">
                      Cargando directorio de usuarios...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-800">No se encontraron usuarios</p>
                      <p className="text-xs text-slate-400 mt-0.5">Intenta con otro filtro o término de búsqueda.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isPassVisible = !!visiblePasswords[u.id];
                    const plainPass = u.password_plain || '(Sin clave)';
                    const isCurrent = currentUser.username?.toLowerCase() === u.username.toLowerCase();

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* 1. Usuario & Nombre */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold uppercase text-xs shrink-0 shadow-2xs">
                              {u.username.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-slate-900 text-xs truncate">
                                  {u.username}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    Tú
                                  </span>
                                )}
                              </div>
                              {u.nombre_completo && (
                                <span className="text-[11px] font-medium text-slate-500 block truncate mt-0.5">
                                  {u.nombre_completo}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Rol */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderRoleBadge(u.rol)}
                        </td>

                        {/* 3. Contraseña Asignada */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs">
                            <span className="text-xs font-bold text-slate-700 select-all font-mono tracking-wider w-20 truncate">
                              {isPassVisible ? plainPass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                              title={isPassVisible ? 'Ocultar contraseña' : 'Ver contraseña'}
                            >
                              {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            {u.password_plain && (
                              <button
                                type="button"
                                onClick={() => copyPassword(u.id, u.password_plain)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  copiedId === u.id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                                }`}
                                title="Copiar contraseña"
                              >
                                {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 4. Matriz de Permisos por Módulos (Diseño Limpio Alineado) */}
                        <td className="py-3.5 px-4">
                          {u.rol === 'admin' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/80">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-extrabold tracking-wide">Acceso Total a todos los módulos</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/70">
                                {MODULOS_INFO.map(mod => {
                                  const level = getPermLevel(u, mod.key);
                                  const Icon = mod.icon;
                                  const isEdit = level === 'escritura' || level === 'admin';
                                  const isRead = level === 'lectura';

                                  return (
                                    <div
                                      key={mod.key}
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                        isEdit
                                          ? 'bg-emerald-500 text-white shadow-2xs'
                                          : isRead
                                          ? 'bg-blue-500 text-white shadow-2xs'
                                          : 'bg-transparent text-slate-300 opacity-40'
                                      }`}
                                      title={`${mod.label}: ${isEdit ? 'Edición total' : isRead ? 'Solo lectura' : 'Sin acceso'}`}
                                    >
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                                {countActiveModules(u)} de 6 activos
                              </span>
                            </div>
                          )}
                        </td>

                        {/* 5. Estado */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => toggleStatusMutation.mutate({ id: u.id, activo: !u.activo })}
                            disabled={isCurrent}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                              u.activo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 disabled:opacity-50'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 disabled:opacity-50'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span>{u.activo ? 'Activo' : 'Inactivo'}</span>
                          </button>
                        </td>

                        {/* 6. Acciones */}
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                              title="Editar usuario y permisos"
                            >
                              <Pencil className="w-3.5 h-3.5 text-slate-500" />
                              <span className="hidden sm:inline">Editar</span>
                            </button>
                            <button
                              onClick={() => confirmAction('Eliminar Usuario', `¿Estás seguro de eliminar al usuario "${u.username}"? Perderá el acceso de inmediato.`, () => deleteMutation.mutate(u.id))}
                              disabled={isCurrent}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        )}

        {/* ========== CONTENIDO: VISTA FICHAS / TARJETAS ========== */}
        {viewMode === 'tarjetas' && (
          <div className="p-4 sm:p-5">
            {isLoading ? (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">
                Cargando directorio de usuarios...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center">
                <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-800">No se encontraron usuarios</p>
                <p className="text-xs text-slate-400 mt-0.5">Intenta con otro filtro de búsqueda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredUsers.map((u) => {
                  const isPassVisible = !!visiblePasswords[u.id];
                  const plainPass = u.password_plain || '(Sin clave)';
                  const isCurrent = currentUser.username?.toLowerCase() === u.username.toLowerCase();

                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Cabecera de la ficha */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-extrabold uppercase text-xs shrink-0 shadow-2xs">
                              {u.username.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-extrabold text-slate-900 text-sm truncate">
                                  {u.username}
                                </h3>
                                {isCurrent && (
                                  <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                                {u.nombre_completo || 'Sin nombre registrado'}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleStatusMutation.mutate({ id: u.id, activo: !u.activo })}
                            disabled={isCurrent}
                            className={`inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                              u.activo
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span>{u.activo ? 'Activo' : 'Inactivo'}</span>
                          </button>
                        </div>

                        {/* Fila de Rol y Contraseña */}
                        <div className="flex items-center justify-between gap-2 py-2.5 border-y border-slate-100 text-xs">
                          <div>{renderRoleBadge(u.rol)}</div>

                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-50 border border-slate-200/80">
                            <span className="text-xs font-bold text-slate-700 select-all font-mono tracking-wider">
                              {isPassVisible ? plainPass : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(u.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                              title="Ver / Ocultar"
                            >
                              {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                            {u.password_plain && (
                              <button
                                type="button"
                                onClick={() => copyPassword(u.id, u.password_plain)}
                                className="p-0.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                                title="Copiar contraseña"
                              >
                                {copiedId === u.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Matriz de Permisos */}
                        <div className="py-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                            Acceso a Módulos ({countActiveModules(u)} de 6)
                          </span>

                          {u.rol === 'admin' ? (
                            <div className="bg-purple-50 text-purple-700 text-xs font-bold p-2.5 rounded-2xl border border-purple-200 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-purple-600" />
                              <span>Control y permisos totales en todos los módulos</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              {MODULOS_INFO.map(mod => {
                                const level = getPermLevel(u, mod.key);
                                const isEdit = level === 'escritura' || level === 'admin';
                                const isRead = level === 'lectura';

                                return (
                                  <div
                                    key={mod.key}
                                    className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-[11px] font-bold ${
                                      isEdit
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : isRead
                                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200/60 opacity-60'
                                    }`}
                                  >
                                    <span>{mod.label}</span>
                                    <span className="text-[9px] font-black uppercase">
                                      {isEdit ? 'Edición' : isRead ? 'Lectura' : 'Ninguno'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Pie de la ficha: Botones de acción */}
                      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar Permisos</span>
                        </button>
                        <button
                          onClick={() => confirmAction('Eliminar Usuario', `¿Estás seguro de eliminar a "${u.username}"?`, () => deleteMutation.mutate(u.id))}
                          disabled={isCurrent}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors disabled:opacity-20 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ========== MODAL DE CREACIÓN / EDICIÓN ========== */}
      <AnimatePresence>
        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={SPRING_FAST}
              className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden my-auto sm:my-8 shadow-2xl max-h-[92vh] flex flex-col border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    {editingUser ? `Editar Usuario: ${editingUser.username}` : 'Nuevo Usuario'}
                  </h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Asigna credenciales y personaliza los niveles de acceso por módulo.
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-85px)] custom-scrollbar">
                {formError && (
                  <div className="text-xs font-bold text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200">
                    {formError}
                  </div>
                )}

                {/* Campos Principales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Nombre de Usuario <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. GPastrana"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Guadalupe Enrique Pastrana"
                      value={formData.nombre_completo}
                      onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      Rol Principal &bull; Preset
                    </label>
                    <select
                      value={formData.rol}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {Object.entries(ROL_PRESETS).map(([key, info]) => (
                        <option key={key} value={key}>{info.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
                      {editingUser ? 'Nueva Contraseña' : 'Contraseña Asignada'} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={!editingUser}
                      placeholder={editingUser ? 'Dejar en blanco para conservar...' : 'Mínimo 4 caracteres...'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none font-mono focus:ring-2 focus:ring-slate-900/10 focus:bg-white"
                    />
                  </div>
                </div>

                {/* MATRIZ DE PERMISOS POR MÓDULO */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Matriz de Permisos por Módulo
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Personaliza el nivel de cada sección
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                    {MODULOS_INFO.map(mod => {
                      const currentVal = (formData.permisos as any)[mod.key] || 'ninguno';
                      const Icon = mod.icon;

                      return (
                        <div
                          key={mod.key}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-xl bg-white border border-slate-200/60 gap-2"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                                {mod.label}
                              </span>
                              <span className="text-[10px] text-slate-400 block leading-tight">
                                {mod.desc}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                permisos: { ...formData.permisos, [mod.key]: 'ninguno' }
                              })}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                                currentVal === 'ninguno'
                                  ? 'bg-slate-900 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-500 hover:text-slate-800'
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
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              Lectura
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
                                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {mod.key === 'usuarios' ? 'Admin' : 'Edición'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Botones de acción modal */}
                <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {saveMutation.isPending ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
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
