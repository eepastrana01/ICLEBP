import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { SPRING_FAST } from '../lib/animations';

interface MiembroEquipo {
  id: number;
  nombre: string;
  cargo: string;
  nivel: number;
}

// Configuración visual por niveles de la estructura eclesiástica
const NIVELES_CONFIG: Record<number, {
  titulo: string;
  subtitulo: string;
  themeColor: string;
  badgeBg: string;
  badgeText: string;
  borderHover: string;
  iconBg: string;
  iconColor: string;
  iconSvg: React.ReactNode;
}> = {
  1: {
    titulo: 'Liderazgo Pastoral',
    subtitulo: 'Pastores principales y dirección espiritual',
    themeColor: 'amber',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    borderHover: 'hover:border-amber-300',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    iconSvg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-amber-500">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    )
  },
  2: {
    titulo: 'Presidencia de Congregación',
    subtitulo: 'Presidencia y enlace congregacional',
    themeColor: 'indigo',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderHover: 'hover:border-indigo-300',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-600',
    iconSvg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  3: {
    titulo: 'Directiva Oficial',
    subtitulo: 'Administración, secretaría, tesorería y fiscalía',
    themeColor: 'slate',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    borderHover: 'hover:border-slate-300',
    iconBg: 'bg-slate-500/10',
    iconColor: 'text-slate-700',
    iconSvg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    )
  },
  4: {
    titulo: 'Coordinadores de Ministerios',
    subtitulo: 'Líderes de grupos y ministerios congregacionales',
    themeColor: 'emerald',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    borderHover: 'hover:border-emerald-300',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    iconSvg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  5: {
    titulo: 'Cuerpo de Vocales',
    subtitulo: 'Vocales y apoyo al consejo pastoral',
    themeColor: 'sky',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    borderHover: 'hover:border-sky-300',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600',
    iconSvg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
    )
  },
  6: {
    titulo: 'Soporte y Logística',
    subtitulo: 'Infraestructura técnica, tecnología y operaciones',
    themeColor: 'violet',
    badgeBg: 'bg-violet-50',
    badgeText: 'text-violet-700',
    borderHover: 'hover:border-violet-300',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
    iconSvg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  }
};

export default function TeamView() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';
  const canWrite = isAdmin || user.permisos?.equipo === 'escritura' || user.permisos?.equipo === 'admin';

  // Modal de edición
  const [editingItem, setEditingItem] = useState<MiembroEquipo | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar equipo
  const { data: equipo = [], isLoading } = useQuery<MiembroEquipo[]>({
    queryKey: ['equipo'],
    queryFn: async () => (await api.get('/equipo')).data
  });

  // Mutación para actualizar asignación
  const updateMutation = useMutation({
    mutationFn: ({ id, nombre, cargo }: { id: number; nombre: string; cargo?: string }) =>
      api.put(`/equipo/${id}`, { nombre, cargo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipo'] });
      closeEditModal();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Error al actualizar el cargo.');
    }
  });

  const openEditModal = (item: MiembroEquipo) => {
    setEditingItem(item);
    setEditNombre(item.nombre === 'Por asignar' ? '' : item.nombre);
    setEditCargo(item.cargo);
    setErrorMsg('');
  };

  const closeEditModal = () => {
    setEditingItem(null);
    setEditNombre('');
    setEditCargo('');
    setErrorMsg('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const finalNombre = editNombre.trim() || 'Por asignar';
    const finalCargo = editCargo.trim() || editingItem.cargo;
    updateMutation.mutate({
      id: editingItem.id,
      nombre: finalNombre,
      cargo: finalCargo
    });
  };

  return (
    <div className="min-h-full font-sans text-slate-900 pb-16">

      {/* ========== TOPBAR ========== */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Liderazgo &bull; El Buen Pastor
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Equipo Pastoral
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Estructura organizativa, directiva y coordinadores de ministerios de la congregación.
          </p>
        </div>

        {isAdmin && (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/70 border border-white/90 shadow-2xs text-xs font-semibold text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>Modo Administrador: Haz clic en el lápiz para reasignar cargos</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="glass-panel rounded-[2rem] p-16 text-center">
          <p className="text-xs font-semibold text-slate-400">Cargando estructura del equipo pastoral...</p>
        </div>
      ) : (
        <div className="space-y-8 sm:space-y-10 max-w-5xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((nivel) => {
            const grupo = equipo.filter((m) => m.nivel === nivel);
            if (grupo.length === 0) return null;
            const config = NIVELES_CONFIG[nivel] || NIVELES_CONFIG[3];

            return (
              <section key={nivel} className="space-y-4">
                
                {/* Encabezado del Nivel / Categoría */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5 px-1">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                      <span>{config.titulo}</span>
                    </h2>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                      {config.subtitulo}
                    </p>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-white/70 px-2.5 py-1 rounded-xl border border-white/80 shadow-2xs">
                    {grupo.length} {grupo.length === 1 ? 'Cargo' : 'Cargos'}
                  </span>
                </div>

                {/* Grid de Tarjetas Bento */}
                <div className={`grid gap-4 ${
                  grupo.length === 1
                    ? 'grid-cols-1 max-w-md mx-auto'
                    : grupo.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}>
                  {grupo.map((item) => {
                    const isUnassigned = !item.nombre || item.nombre.toLowerCase() === 'por asignar';

                    return (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -2, scale: 1.008 }}
                        transition={SPRING_FAST}
                        className={`glass-panel rounded-[1.75rem] p-5 relative flex flex-col justify-between border border-white/90 shadow-2xs group transition-all duration-200 ${config.borderHover}`}
                      >
                        {/* Botón de edición para usuarios con permiso de escritura */}
                        {canWrite && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="absolute top-4 right-4 w-7 h-7 rounded-xl bg-white/80 hover:bg-slate-900 hover:text-white text-slate-400 flex items-center justify-center transition-all duration-200 shadow-2xs border border-white/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
                            title="Reasignar persona a este cargo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                          </button>
                        )}

                        {/* Contenido de la tarjeta */}
                        <div className="flex items-start gap-3.5 mb-3">
                          {/* Avatar / Icono */}
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-white/80 shadow-2xs ${
                            isUnassigned ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900 font-extrabold text-xs'
                          }`}>
                            {config.iconSvg}
                          </div>

                          {/* Textos del Cargo y Nombre */}
                          <div className="min-w-0 flex-1 pr-6">
                            <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md mb-1 border border-slate-200/50 ${config.badgeBg} ${config.badgeText}`}>
                              {item.cargo}
                            </span>
                            <h3 className={`text-sm font-bold truncate leading-tight ${
                              isUnassigned ? 'text-slate-400 italic' : 'text-slate-900'
                            }`}>
                              {item.nombre}
                            </h3>
                          </div>
                        </div>

                        {/* Footer de estado */}
                        <div className="pt-2.5 border-t border-white/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-medium">Estado:</span>
                          <span className={`inline-flex items-center gap-1.5 font-bold ${
                            isUnassigned ? 'text-amber-600' : 'text-emerald-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isUnassigned ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                            {isUnassigned ? 'Vacante' : 'Asignado'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ========== MODAL DE ASIGNACIÓN RÁPIDA ========== */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4"
            onClick={closeEditModal}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={SPRING_FAST}
              className="glass-panel-elevated rounded-[2rem] w-full max-w-md overflow-hidden p-6 sm:p-7 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 mb-5">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Asignar Cargo Eclesiástico
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Modifica el nombre o título de la persona asignada.
                  </p>
                </div>
                <button
                  onClick={closeEditModal}
                  className="w-8 h-8 rounded-xl bg-white/70 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Título / Cargo Oficial
                  </label>
                  <input
                    type="text"
                    required
                    value={editCargo}
                    onChange={(e) => setEditCargo(e.target.value)}
                    className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
                    placeholder="Ej. Pastor Presidente, Tesorera..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nombre del Miembro Asignado
                  </label>
                  <input
                    type="text"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
                    placeholder="Escribe el nombre completo o deja vacío para 'Por asignar'..."
                    autoFocus
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditNombre('Por asignar')}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Establecer como "Por asignar"
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex gap-2.5">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="glass-button-secondary flex-1 rounded-2xl text-slate-700 text-xs font-bold py-2.5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="flex-1 rounded-2xl bg-slate-900 text-white text-xs font-extrabold py-2.5 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar Asignación'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
