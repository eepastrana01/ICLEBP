import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_FAST } from '../lib/animations';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
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
  Plus,
  ChevronDown,
  RefreshCw,
  CheckCircle2
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
  { key: 'finanzas', label: 'Finanzas', short: 'Fin', icon: Wallet, desc: 'Ingresos, egresos y talonarios' },
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

  // Estados principales
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'tabla' | 'tarjetas'>('tabla');

  // Modales
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [editModalTab, setEditModalTab] = useState<'datos' | 'permisos'>('datos');

  // Modal de Credenciales / Reset Password
  const [credentialsUser, setCredentialsUser] = useState<Usuario | null>(null);
  const [showCredPassword, setShowCredPassword] = useState(false);
  const [copiedPassOnly, setCopiedPassOnly] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Bloquear scroll de fondo cuando hay un modal abierto
  useEffect(() => {
    if (credentialsUser || showEditModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [credentialsUser, showEditModal]);

  // Toast flotante
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State para Crear / Editar
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Resumen visual estructurado de permisos
  const getPermissionsSummary = (u: Usuario) => {
    if (u.rol === 'admin') {
      return {
        label: 'Acceso Total (Admin)',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
        icon: ShieldCheck,
        tooltip: 'Control total de administración en los 6 módulos'
      };
    }

    const perms = u.permisos || {};
    let editCount = 0;
    let readCount = 0;
    const editMods: string[] = [];
    const readMods: string[] = [];

    MODULOS_INFO.forEach(m => {
      const val = (perms as any)[m.key];
      if (val === 'escritura' || val === 'admin') {
        editCount++;
        editMods.push(m.label);
      } else if (val === 'lectura') {
        readCount++;
        readMods.push(m.label);
      }
    });

    const totalActive = editCount + readCount;

    if (totalActive === 0) {
      return {
        label: 'Sin permisos asignados',
        badgeClass: 'bg-slate-100 text-slate-500 border-slate-200',
        icon: ShieldAlert,
        tooltip: 'Sin acceso a módulos del sistema'
      };
    }

    if (editCount > 0 && readCount > 0) {
      return {
        label: `${editCount} edición • ${readCount} lectura`,
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200/80',
        icon: CheckCircle2,
        tooltip: `Edición: ${editMods.join(', ')} | Lectura: ${readMods.join(', ')}`
      };
    }

    if (editCount > 0) {
      return {
        label: `Edición (${editCount} ${editCount === 1 ? 'módulo' : 'módulos'})`,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        icon: CheckCircle2,
        tooltip: `Edición completa: ${editMods.join(', ')}`
      };
    }

    return {
      label: `Solo lectura (${readCount} ${readCount === 1 ? 'módulo' : 'módulos'})`,
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200/80',
      icon: Eye,
      tooltip: `Lectura: ${readMods.join(', ')}`
    };
  };

  // Abrir Modal de Creación
  const openCreate = () => {
    setEditingUser(null);
    setEditModalTab('datos');
    setFormData({
      username: '',
      nombre_completo: '',
      password: '',
      rol: 'lider',
      permisos: { ...ROL_PRESETS.lider.permisos }
    });
    setFormError('');
    setShowEditModal(true);
  };

  // Abrir Modal de Edición Completa
  const openEdit = (u: Usuario) => {
    setEditingUser(u);
    setEditModalTab('datos');
    const initialPerms = u.permisos && typeof u.permisos === 'object'
      ? { ...u.permisos }
      : (ROL_PRESETS[u.rol]?.permisos || { ...ROL_PRESETS.invitado.permisos });

    setFormData({
      username: u.username,
      nombre_completo: u.nombre_completo || '',
      password: '', // En edición se deja vacía; las credenciales se gestionan en su propio modal
      rol: u.rol,
      permisos: initialPerms
    });
    setFormError('');
    setShowEditModal(true);
  };

  // Abrir Modal de Credenciales & Reset Password
  const openCredentials = (u: Usuario) => {
    setCredentialsUser(u);
    setShowCredPassword(false);
    setCopiedPassOnly(false);
    setResetPasswordInput('');
    setResetError('');
    setResetSuccess(false);
  };

  const closeCredentials = () => {
    setCredentialsUser(null);
    setCopiedPassOnly(false);
    setResetPasswordInput('');
    setResetError('');
    setResetSuccess(false);
  };

  const handleRoleChange = (newRole: string) => {
    const preset = ROL_PRESETS[newRole]?.permisos || ROL_PRESETS.invitado.permisos;
    setFormData(prev => ({
      ...prev,
      rol: newRole,
      permisos: { ...preset }
    }));
  };

  // Generador de clave segura sugerida
  const generateRandomPassword = () => {
    const prefixes = ['Pastoral', 'Icleb', 'Gracia', 'Camino', 'Vida'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const year = new Date().getFullYear();
    const randomNum = Math.floor(10 + Math.random() * 90);
    const suggested = `${prefix}${year}${randomNum}!`;
    setResetPasswordInput(suggested);
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
      setShowEditModal(false);
      showToast(editingUser ? 'Usuario actualizado exitosamente' : 'Nuevo usuario registrado');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'No se pudo guardar el usuario.');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      api.put(`/usuarios/${id}/editar`, { password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setResetSuccess(true);
      showToast('Contraseña actualizada correctamente');
      setTimeout(() => {
        closeCredentials();
      }, 1500);
    },
    onError: (err: any) => {
      setResetError(err.response?.data?.error || 'No se pudo actualizar la contraseña.');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      api.put(`/usuarios/${id}/estado`, { activo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showToast('Estado de usuario modificado');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/usuarios/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      showToast('Usuario eliminado del sistema');
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.username.trim()) {
      setFormError('El nombre de usuario es obligatorio.');
      return;
    }

    if (!editingUser && (!formData.password || formData.password.length < 4)) {
      setFormError('La contraseña inicial debe tener al menos 4 caracteres.');
      return;
    }

    const payload: any = {
      username: formData.username.trim(),
      nombre_completo: formData.nombre_completo ? formData.nombre_completo.trim() : null,
      rol: formData.rol,
      permisos: formData.permisos
    };

    if (formData.password && formData.password.trim()) {
      payload.password = formData.password.trim();
    }

    saveMutation.mutate(payload);
  };

  const handleResetPasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (!resetPasswordInput || resetPasswordInput.trim().length < 4) {
      setResetError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (!credentialsUser) return;
    resetPasswordMutation.mutate({ id: credentialsUser.id, password: resetPasswordInput.trim() });
  };

  const renderRoleBadge = (rol: string) => {
    const r = rol.toLowerCase();
    let variant: 'purple' | 'warning' | 'info' | 'success' | 'destructive' | 'secondary' = 'secondary';
    if (r === 'admin') variant = 'purple';
    else if (r === 'pastor') variant = 'warning';
    else if (r === 'secretaria') variant = 'info';
    else if (r === 'tesorera') variant = 'success';
    else if (r === 'fiscal') variant = 'destructive';
    else if (r === 'lider') variant = 'info';

    return (
      <Badge variant={variant}>
        {rol}
      </Badge>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Sistema & Permisos • ICLEB
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Administración de Usuarios
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Gestión centralizada de cuentas, restablecimiento de claves y permisos por sección.
          </p>
        </div>

        <Button
          onClick={openCreate}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Usuario</span>
        </Button>
      </div>

      {/* ========== TARJETAS DE MÉTRICAS ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Directorio de Cuentas
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">{total}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">Usuarios registrados</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
            <Users className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-600 block">
              Administradores
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">{admins}</p>
            <p className="text-xs font-bold text-purple-600 mt-0.5">Control y acceso total</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
              Cuentas Activas
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              {activos} <span className="text-xs font-semibold text-slate-400">/ {total}</span>
            </p>
            <p className="text-xs font-bold text-emerald-700 mt-0.5">
              {total > 0 ? Math.round((activos / total) * 100) : 0}% habilitadas
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
            <Check className="w-5 h-5" />
          </div>
        </motion.div>
      </div>

      {/* ========== PANEL PRINCIPAL: TABLA / FICHAS ========== */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        
        {/* Controles de Búsqueda y Filtros */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario o nombre..."
              className="w-full h-10 bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs transition-all"
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

          {/* Filtros por Rol + Alternador de Vista */}
          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            <div className="flex flex-wrap items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/60">
              {[
                { id: 'todos', label: `Todos (${total})`, activeBg: 'bg-slate-900' },
                { id: 'admin', label: `Admins (${admins})`, activeBg: 'bg-purple-600' },
                { id: 'pastor', label: `Pastores (${pastoresCount})`, activeBg: 'bg-amber-600' },
                { id: 'lideres', label: `Líderes (${lideresCount})`, activeBg: 'bg-indigo-600' },
                ...(inactivos > 0 ? [{ id: 'inactivos', label: `Inactivos (${inactivos})`, activeBg: 'bg-rose-600' }] : [])
              ].map((tab) => {
                const isActive = roleFilter === tab.id;
                return (
                  <motion.button
                    key={tab.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setRoleFilter(tab.id)}
                    className={`relative px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer select-none ${
                      isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeRoleFilter"
                        className={`absolute inset-0 rounded-xl shadow-2xs ${tab.activeBg}`}
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Alternador Vista Tabla vs Tarjetas */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setViewMode('tabla')}
                className={`relative p-1.5 rounded-lg transition-colors cursor-pointer select-none ${
                  viewMode === 'tabla' ? 'text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
                title="Vista Tabla"
              >
                {viewMode === 'tabla' && (
                  <motion.div
                    layoutId="activeViewMode"
                    className="absolute inset-0 bg-slate-900 rounded-lg shadow-2xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <TableIcon className="w-4 h-4 relative z-10" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => setViewMode('tarjetas')}
                className={`relative p-1.5 rounded-lg transition-colors cursor-pointer select-none ${
                  viewMode === 'tarjetas' ? 'text-white' : 'text-slate-400 hover:text-slate-800'
                }`}
                title="Vista Fichas"
              >
                {viewMode === 'tarjetas' && (
                  <motion.div
                    layoutId="activeViewMode"
                    className="absolute inset-0 bg-slate-900 rounded-lg shadow-2xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  />
                )}
                <LayoutGrid className="w-4 h-4 relative z-10" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* ========== VISTA TABLA LIMPIA Y DESPEJADA ========== */}
        {viewMode === 'tabla' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-6">Usuario & Nombre</th>
                  <th className="py-3.5 px-4">Rol Asignado</th>
                  <th className="py-3.5 px-4">Nivel de Permisos</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-6 text-right">Opciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-xs font-semibold text-slate-400">
                      Cargando directorio de usuarios...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <UserX className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-800">No se encontraron usuarios</p>
                      <p className="text-xs text-slate-400 mt-0.5">Intenta con otro filtro o término de búsqueda.</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isCurrent = currentUser.username?.toLowerCase() === u.username.toLowerCase();
                    const permSummary = getPermissionsSummary(u);
                    const SummaryIcon = permSummary.icon;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        
                        {/* 1. Usuario & Nombre */}
                        <td className="py-3.5 px-6">
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

                        {/* 2. Rol Asignado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderRoleBadge(u.rol)}
                        </td>

                        {/* 3. Permisos (Resumen Claro, sin saturar la fila) */}
                        <td className="py-3.5 px-4">
                          <div
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold cursor-default ${permSummary.badgeClass}`}
                            title={permSummary.tooltip}
                          >
                            <SummaryIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{permSummary.label}</span>
                          </div>
                        </td>

                        {/* 4. Estado */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <motion.button
                            whileTap={{ scale: 0.94 }}
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
                          </motion.button>
                        </td>

                        {/* 5. Acciones: Clave, Editar, Eliminar */}
                        <td className="py-3.5 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Botón de Clave y Credenciales */}
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openCredentials(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
                              title="Ver credenciales o restablecer contraseña"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                              <span className="hidden sm:inline">Contraseña</span>
                            </motion.button>

                            {/* Botón de Editar Usuario & Permisos */}
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => openEdit(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                              title="Editar rol y matriz de permisos"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Editar</span>
                            </motion.button>

                            {/* Botón Eliminar */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => confirmAction('Eliminar Usuario', `¿Estás seguro de eliminar al usuario "${u.username}"? Perderá el acceso de inmediato.`, () => deleteMutation.mutate(u.id))}
                              disabled={isCurrent}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                              title="Eliminar usuario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
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

        {/* ========== VISTA FICHAS / TARJETAS ========== */}
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
                  const isCurrent = currentUser.username?.toLowerCase() === u.username.toLowerCase();
                  const permSummary = getPermissionsSummary(u);
                  const SummaryIcon = permSummary.icon;

                  return (
                    <motion.div
                      key={u.id}
                      whileHover={{ y: -2 }}
                      transition={SPRING_FAST}
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

                          <motion.button
                            whileTap={{ scale: 0.94 }}
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
                          </motion.button>
                        </div>

                        {/* Rol y Nivel de Acceso */}
                        <div className="py-2.5 border-y border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rol</span>
                            <div>{renderRoleBadge(u.rol)}</div>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Permisos</span>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold ${permSummary.badgeClass}`}>
                              <SummaryIcon className="w-3 h-3 shrink-0" />
                              <span>{permSummary.label}</span>
                            </div>
                          </div>
                        </div>

                        {/* Módulos en cuadrícula limpia */}
                        <div className="py-3">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                            Resumen de Módulos
                          </span>

                          {u.rol === 'admin' ? (
                            <div className="bg-purple-50 text-purple-700 text-xs font-bold p-2.5 rounded-2xl border border-purple-200 flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4 text-purple-600" />
                              <span>Control y permisos totales en todos los módulos</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              {MODULOS_INFO.map(mod => {
                                const level = (u.permisos as any)?.[mod.key] || 'ninguno';
                                const isEdit = level === 'escritura' || level === 'admin';
                                const isRead = level === 'lectura';

                                return (
                                  <div
                                    key={mod.key}
                                    className={`px-2 py-1.5 rounded-xl border flex items-center justify-between text-[11px] font-bold ${
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

                      {/* Pie de la ficha: Opciones */}
                      <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <motion.button
                          whileTap={{ scale: 0.96 }}
                          onClick={() => openCredentials(u)}
                          className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                          title="Ver y restablecer contraseña"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          <span>Clave</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => openEdit(u)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar Permisos</span>
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => confirmAction('Eliminar Usuario', `¿Estás seguro de eliminar a "${u.username}"?`, () => deleteMutation.mutate(u.id))}
                          disabled={isCurrent}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors disabled:opacity-20 cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: GESTIÓN DE CREDENCIALES & RESET PASSWORD        */}
      {/* ======================================================== */}
      {createPortal(
        <AnimatePresence>
          {credentialsUser && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
              onClick={closeCredentials}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={SPRING_FAST}
                className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200/60">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">
                        Credenciales de Acceso
                      </h2>
                      <p className="text-xs font-medium text-slate-500">
                        Usuario: <span className="font-bold text-slate-900">{credentialsUser.username}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeCredentials}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-5">
                  
                  {/* 1. Tarjeta con credenciales actuales */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Credenciales Actuales Registradas
                    </span>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Usuario:</span>
                        <span className="font-mono font-extrabold text-slate-900 select-all">{credentialsUser.username}</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Contraseña:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 select-all tracking-wider">
                            {showCredPassword
                              ? credentialsUser.password_plain || '(Sin contraseña registrada)'
                              : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCredPassword(!showCredPassword)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-white transition-colors cursor-pointer"
                            title="Ver / Ocultar"
                          >
                            {showCredPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          {credentialsUser.password_plain && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(credentialsUser.password_plain!);
                                setCopiedPassOnly(true);
                                setTimeout(() => setCopiedPassOnly(false), 2000);
                                showToast('Contraseña copiada al portapapeles');
                              }}
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                copiedPassOnly ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                              }`}
                              title="Copiar contraseña sola"
                            >
                              {copiedPassOnly ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Sección de Restablecimiento de Contraseña */}
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-900 block">
                        Restablecer Nueva Contraseña
                      </label>
                      <button
                        type="button"
                        onClick={generateRandomPassword}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                        title="Generar una contraseña aleatoria sugerida"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Sugerir clave</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Escribe la nueva contraseña..."
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:bg-white shadow-2xs"
                    />

                    {resetError && (
                      <p className="text-xs font-bold text-rose-600">{resetError}</p>
                    )}

                    {resetSuccess && (
                      <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>¡Contraseña actualizada exitosamente!</span>
                      </p>
                    )}

                    <div className="flex items-center gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={closeCredentials}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Cerrar
                      </button>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        type="submit"
                        disabled={resetPasswordMutation.isPending || !resetPasswordInput.trim()}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] transition-all disabled:opacity-40 cursor-pointer"
                      >
                        {resetPasswordMutation.isPending ? 'Guardando...' : 'Cambiar Clave'}
                      </motion.button>
                    </div>
                  </form>

                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ======================================================== */}
      {/* MODAL 2: CREACIÓN / EDICIÓN ORGANIZADA POR PESTAÑAS      */}
      {/* ======================================================== */}
      {createPortal(
        <AnimatePresence>
          {showEditModal && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
              onClick={() => setShowEditModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 12 }}
                transition={SPRING_FAST}
                className="bg-white rounded-[2rem] w-full max-w-xl overflow-hidden my-auto shadow-2xl flex flex-col border border-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {editingUser ? `Editar: ${editingUser.username}` : 'Registrar Nuevo Usuario'}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Configuración de perfil y matriz de permisos por sección.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Pestañas de Navegación del Modal (Mismo Tamaño 50% / 50%) */}
              <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 shrink-0">
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setEditModalTab('datos')}
                    className={`relative py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center select-none ${
                      editModalTab === 'datos' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {editModalTab === 'datos' && (
                      <motion.div
                        layoutId="activeEditModalTab"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>1. Datos & Rol</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditModalTab('permisos')}
                    className={`relative py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer text-center select-none ${
                      editModalTab === 'permisos' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {editModalTab === 'permisos' && (
                      <motion.div
                        layoutId="activeEditModalTab"
                        className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/80"
                        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-500" />
                      <span>2. Matriz de Permisos</span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Formulario con altura fija y consistente para que ambas pestañas tengan exactamente el mismo tamaño */}
              <form onSubmit={handleSubmit} className="flex flex-col">
                
                {/* Contenedor de Altura Fija y Sincronizada */}
                <div className="p-6 space-y-4 h-[470px] overflow-y-auto custom-scrollbar">
                  {formError && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs font-bold text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200"
                    >
                      {formError}
                    </motion.div>
                  )}

                  {/* PESTAÑA 1: DATOS & ROL (Diseño estructurado y balanceado) */}
                  {editModalTab === 'datos' && (
                    <div className="space-y-4">
                      {/* 1. Identificación */}
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Identificación de Usuario
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[11px] font-black text-slate-600 mb-1">
                              Nombre de Usuario <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. GPastrana"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-black text-slate-600 mb-1">
                              Nombre Completo
                            </label>
                            <input
                              type="text"
                              placeholder="Ej. Guadalupe Enrique Pastrana"
                              value={formData.nombre_completo}
                              onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-2xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* 2. Rol & Función */}
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                            Rol Principal &bull; Preset
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Auto-configura permisos sugeridos
                          </span>
                        </div>

                        <div className="relative">
                          <select
                            value={formData.rol}
                            onChange={(e) => handleRoleChange(e.target.value)}
                            className="w-full bg-white hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-slate-400 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none transition-all cursor-pointer appearance-none pr-9 shadow-2xs"
                          >
                            {Object.entries(ROL_PRESETS).map(([key, info]) => (
                              <option key={key} value={key}>{info.label}</option>
                            ))}
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>

                        {/* Tarjeta explicativa según el rol */}
                        <div className="p-3 rounded-xl bg-white border border-slate-200/60 text-xs text-slate-600 flex items-start gap-2">
                          <div className="p-1 rounded-lg bg-indigo-50 text-indigo-700 shrink-0 mt-0.5">
                            <Shield className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {formData.rol === 'admin'
                                ? 'Administrador del Sistema'
                                : formData.rol === 'pastor'
                                ? 'Pastor / Dirección Ministerial'
                                : formData.rol === 'secretaria'
                                ? 'Secretaría Pastoral'
                                : formData.rol === 'tesorera'
                                ? 'Tesorería y Finanzas'
                                : formData.rol === 'fiscal'
                                ? 'Fiscalía y Auditoría'
                                : formData.rol === 'lider'
                                ? 'Liderazgo de Ministerio'
                                : 'Invitado'}
                            </span>
                            <span className="text-[11px] text-slate-500 block leading-tight mt-0.5">
                              {formData.rol === 'admin'
                                ? 'Control absoluto de configuración, administración de usuarios y todos los módulos.'
                                : formData.rol === 'pastor'
                                ? 'Supervisión general pastoral con edición completa en agenda y actividades.'
                                : formData.rol === 'secretaria'
                                ? 'Edición en agenda, directorio de miembros y actas de bautismo.'
                                : formData.rol === 'tesorera'
                                ? 'Edición y emisión de recibos en finanzas y rifas pro-fondos.'
                                : formData.rol === 'fiscal'
                                ? 'Supervisión en modo lectura para auditoría y verificación.'
                                : formData.rol === 'lider'
                                ? 'Planificación de actividades de su grupo y registro de eventos.'
                                : 'Acceso básico de consulta a la información pública.'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 3. Contraseña */}
                      <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Seguridad de Acceso
                        </span>

                        {!editingUser ? (
                          <div>
                            <label className="block text-[11px] font-black text-slate-600 mb-1">
                              Contraseña Inicial <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Mínimo 4 caracteres..."
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none font-mono shadow-2xs"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-xs py-1">
                            <div>
                              <span className="font-extrabold text-slate-800 block">Contraseña Protegida</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Puedes restablecerla o consultarla desde el botón "Contraseña" en la tabla.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowEditModal(false);
                                openCredentials(editingUser);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs transition-colors cursor-pointer shrink-0 ml-3"
                            >
                              Ver / Cambiar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PESTAÑA 2: MATRIZ DE PERMISOS (Desglose limpio de los 6 módulos) */}
                  {editModalTab === 'permisos' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                          Niveles de Acceso por Módulo
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Personaliza cada sección de forma independiente
                        </span>
                      </div>

                      <div className="space-y-2 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
                        {MODULOS_INFO.map(mod => {
                          const currentVal = (formData.permisos as any)[mod.key] || 'ninguno';
                          const Icon = mod.icon;

                          const options = [
                            { value: 'ninguno', label: 'Sin Acceso', activeBg: 'bg-slate-900' },
                            { value: 'lectura', label: 'Lectura', activeBg: 'bg-blue-600' },
                            {
                              value: mod.key === 'usuarios' ? 'admin' : 'escritura',
                              label: mod.key === 'usuarios' ? 'Admin' : 'Edición',
                              activeBg: 'bg-emerald-600'
                            }
                          ];

                          return (
                            <div
                              key={mod.key}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/60 hover:border-slate-300 transition-colors gap-2.5"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                                    {mod.label}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block leading-tight mt-0.5">
                                    {mod.desc}
                                  </span>
                                </div>
                              </div>

                              {/* Control Segmentado Suave con Animación Spring */}
                              <div className="relative flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/50 self-end sm:self-auto shadow-inner">
                                {options.map((opt) => {
                                  const isOptionActive =
                                    opt.value === 'ninguno'
                                      ? currentVal === 'ninguno'
                                      : opt.value === 'lectura'
                                      ? currentVal === 'lectura'
                                      : currentVal === 'escritura' || currentVal === 'admin';

                                  return (
                                    <motion.button
                                      key={opt.value}
                                      type="button"
                                      whileTap={{ scale: 0.94 }}
                                      onClick={() => {
                                        setFormData(prev => ({
                                          ...prev,
                                          permisos: { ...prev.permisos, [mod.key]: opt.value }
                                        }));
                                      }}
                                      className={`relative px-3 py-1.5 text-[10px] font-black tracking-wide rounded-lg cursor-pointer transition-colors select-none ${
                                        isOptionActive ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                                      }`}
                                    >
                                      {isOptionActive && (
                                        <motion.div
                                          layoutId={`active-seg-${mod.key}`}
                                          className={`absolute inset-0 rounded-lg shadow-2xs ${opt.activeBg}`}
                                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                                        />
                                      )}
                                      <span className="relative z-10">{opt.label}</span>
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer del Modal Fijo (Mismo tamaño y alineación siempre) */}
                <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {saveMutation.isPending ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}

    {/* Toast Flotante con Máximo z-index (z-[9999]) para superponer cualquier modal y backdrop */}
    {createPortal(
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed top-6 right-6 z-[9999] bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-slate-700/80 pointer-events-none"
          >
            <div className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span className="tracking-wide text-slate-100">{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )}

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
