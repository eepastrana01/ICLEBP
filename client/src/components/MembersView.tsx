import { useState, useMemo, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';

interface Miembro {
  id: number;
  nombre: string;
  fecha_nacimiento: string;
  congregacion: string;
  bautizado: boolean;
  confirmado: boolean;
}

export default function MembersView() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';
  const canWrite = isAdmin || user.permisos?.miembros === 'escritura' || user.permisos?.miembros === 'admin';
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  // Navigation between Directory list and dedicated inline Form
  const [activeView, setActiveView] = useState<'list' | 'form'>('list');
  const [editingItem, setEditingItem] = useState<Miembro | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [form, setForm] = useState({
    nombre: '',
    fecha_nacimiento: '',
    congregacion: '',
    bautizado: false,
    confirmado: false,
  });
  const [formError, setFormError] = useState('');

  const { data: miembros, isLoading } = useQuery<Miembro[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data,
  });

  const total = miembros?.length || 0;
  const bautizados = miembros?.filter(m => m.bautizado).length || 0;
  const confirmados = miembros?.filter(m => m.confirmado).length || 0;
  const pctBautizados = total > 0 ? Math.round((bautizados / total) * 100) : 0;
  const pctConfirmados = total > 0 ? Math.round((confirmados / total) * 100) : 0;

  // Filtered members by search term
  const filteredMiembros = useMemo(() => {
    if (!miembros) return [];
    if (!searchTerm.trim()) return miembros;
    const term = searchTerm.toLowerCase();
    return miembros.filter(m =>
      m.nombre.toLowerCase().includes(term) ||
      (m.congregacion && m.congregacion.toLowerCase().includes(term))
    );
  }, [miembros, searchTerm]);

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      nombre: '',
      fecha_nacimiento: new Date().toISOString().split('T')[0],
      congregacion: '',
      bautizado: false,
      confirmado: false
    });
    setFormError('');
    setActiveView('form');
  };

  const openEdit = (m: Miembro) => {
    setEditingItem(m);
    let dateStr = '';
    if (m.fecha_nacimiento) {
      const d = new Date(m.fecha_nacimiento);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      const yyyy = local.getFullYear();
      const mm = String(local.getMonth() + 1).padStart(2, '0');
      const dd = String(local.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
    }
    setForm({
      nombre: m.nombre,
      fecha_nacimiento: dateStr,
      congregacion: m.congregacion || '',
      bautizado: m.bautizado,
      confirmado: m.confirmado,
    });
    setFormError('');
    setActiveView('form');
  };

  const closeForm = () => {
    setActiveView('list');
    setEditingItem(null);
    setFormError('');
  };

  const crearMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/miembros', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miembros'] });
      closeForm();
    },
    onError: (err: any) => setFormError(err.response?.data?.error || 'No se pudo registrar el miembro.'),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) => api.put(`/miembros/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['miembros'] });
      closeForm();
    },
    onError: (err: any) => setFormError(err.response?.data?.error || 'No se pudo actualizar el miembro.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/miembros/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['miembros'] }),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.nombre.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!form.fecha_nacimiento) {
      setFormError('La fecha de nacimiento es obligatoria.');
      return;
    }
    if (editingItem) {
      editarMutation.mutate({ id: editingItem.id, data: form });
    } else {
      crearMutation.mutate(form);
    }
  };

  const isSaving = crearMutation.isPending || editarMutation.isPending;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No registrada';
    const d = new Date(dateStr);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return local.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="pb-12 font-sans text-slate-900">
      
      {/* ========== TOPBAR ========== */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {activeView === 'form' ? (
            <div className="flex items-center gap-2 mb-2.5">
              <button
                onClick={closeForm}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Directorio
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-900">
                {editingItem ? `Editar: ${editingItem.nombre}` : 'Nuevo Miembro'}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Congregación</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {activeView === 'form'
              ? editingItem ? 'Actualizar Ficha de Miembro' : 'Registrar Nuevo Miembro'
              : 'Directorio de Miembros'}
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            {activeView === 'form'
              ? 'Completa los datos personales y estado sacramental del miembro de la iglesia.'
              : 'Registro general, estado sacramental y grupos eclesiales de la comunidad.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeView === 'list' ? (
            canWrite && (
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={openCreate}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:shadow-lg cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo Miembro
              </motion.button>
            )
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={closeForm}
              className="w-full sm:w-auto glass-button-secondary inline-flex items-center justify-center rounded-2xl text-xs font-bold text-slate-700 h-11 px-5 gap-2 cursor-pointer shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Volver al Directorio
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ==================== VISTA LISTA ==================== */}
        {activeView === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={SPRING_SNAPPY}
            className="space-y-6 sm:space-y-8"
          >
            {/* Metric Cards con física de profundidad */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={SPRING_FAST}
                className="glass-panel rounded-[1.75rem] p-5 sm:p-6 flex items-center justify-between cursor-default"
              >
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Miembros</p>
                  <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 mt-1">{total}</p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">Congregación activa</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-sky-50/80 border border-sky-100 flex items-center justify-center text-sky-600 shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={SPRING_FAST}
                className="glass-panel rounded-[1.75rem] p-5 sm:p-6 flex items-center justify-between cursor-default"
              >
                <div>
                  <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest">Bautizados</p>
                  <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 mt-1">{bautizados} <span className="text-xs font-bold text-slate-400">/ {total}</span></p>
                  <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{pctBautizados}% de la comunidad</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                transition={SPRING_FAST}
                className="glass-panel rounded-[1.75rem] p-5 sm:p-6 flex items-center justify-between cursor-default"
              >
                <div>
                  <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Confirmados</p>
                  <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 mt-1">{confirmados} <span className="text-xs font-bold text-slate-400">/ {total}</span></p>
                  <p className="text-[11px] font-bold text-emerald-600 mt-0.5">{pctConfirmados}% con confirmación</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-50/80 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              </motion.div>
            </div>

            {/* Tabla Glass Panel con barra de búsqueda integrada */}
            <div className="glass-panel rounded-[2rem] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-white/60 gap-3.5">
                <div className="relative flex-1 max-w-none sm:max-w-sm">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o congregación..."
                    className="glass-input w-full rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none"
                  />
                  <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">
                      ✕
                    </button>
                  )}
                </div>

                <div className="text-xs font-bold text-slate-500">
                  Mostrando <span className="text-slate-900">{filteredMiembros.length}</span> de <span className="text-slate-900">{total}</span> miembros
                </div>
              </div>

              <div className="relative w-full overflow-x-auto custom-scrollbar p-2 sm:p-4">
                <table className="w-full text-left text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/60">
                      <th className="h-12 px-6 font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Miembro</th>
                      <th className="h-12 px-6 font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Fecha Nacimiento</th>
                      <th className="h-12 px-6 font-extrabold text-slate-400 uppercase tracking-widest text-[10px]">Congregación / Grupo</th>
                      <th className="h-12 px-6 font-extrabold text-slate-400 uppercase tracking-widest text-[10px] text-center">Bautizado</th>
                      <th className="h-12 px-6 font-extrabold text-slate-400 uppercase tracking-widest text-[10px] text-center">Confirmado</th>
                      {canWrite && <th className="h-12 px-6 font-extrabold text-slate-400 uppercase tracking-widest text-[10px] text-right">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/40">
                    {isLoading ? (
                      <tr><td colSpan={canWrite ? 6 : 5} className="py-20 text-center text-xs font-medium text-slate-400">Cargando directorio de miembros...</td></tr>
                    ) : filteredMiembros.length === 0 ? (
                      <tr>
                        <td colSpan={canWrite ? 6 : 5} className="py-20 text-center">
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/80 border border-white flex items-center justify-center mb-3 text-slate-400 shadow-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                          </div>
                          <p className="text-base font-bold text-slate-800">
                            {searchTerm ? 'No se encontraron miembros con ese criterio' : 'No hay miembros registrados'}
                          </p>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">
                            {searchTerm ? 'Intenta con otro nombre o término.' : canWrite ? 'Haz clic en "Nuevo Miembro" para registrar el primero.' : 'No hay miembros registrados.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredMiembros.map((m) => (
                          <tr
                            key={m.id}
                            className="group transition-colors duration-150 hover:bg-white/70 rounded-2xl"
                          >
                            <td className="px-6 py-4 align-middle rounded-l-2xl">
                              <div className="flex items-center gap-3.5">
                                <div className="w-9 h-9 rounded-xl bg-white/90 border border-white flex items-center justify-center text-slate-700 font-extrabold uppercase text-xs shrink-0 shadow-2xs">
                                  {m.nombre.substring(0, 2)}
                                </div>
                                <span className="font-bold text-slate-900 text-xs">{m.nombre}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-middle font-medium text-xs text-slate-600">
                              {formatDate(m.fecha_nacimiento)}
                            </td>
                            <td className="px-6 py-4 align-middle">
                              {m.congregacion ? (
                                <span className="inline-flex items-center rounded-xl bg-slate-100/70 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-white/60">
                                  {m.congregacion}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-xs">No asignada</span>
                              )}
                            </td>
                            <td className="px-6 py-4 align-middle text-center">
                              {m.bautizado ? (
                                <span className="inline-flex w-6 h-6 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100 shadow-2xs" title="Bautizado">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </span>
                              ) : (
                                <span className="inline-flex w-6 h-6 items-center justify-center rounded-lg bg-slate-50 text-slate-300" title="Pendiente">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 align-middle text-center">
                              {m.confirmado ? (
                                <span className="inline-flex w-6 h-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-2xs" title="Confirmado">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </span>
                              ) : (
                                <span className="inline-flex w-6 h-6 items-center justify-center rounded-lg bg-slate-50 text-slate-300" title="Pendiente">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </span>
                              )}
                            </td>
                            {canWrite && (
                              <td className="px-6 py-4 align-middle text-right rounded-r-2xl">
                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEdit(m)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                                    title="Editar datos del miembro"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  </button>
                                  <button
                                    onClick={() => confirmAction('Eliminar Miembro', `¿Estás seguro de que deseas eliminar a "${m.nombre}" del registro congregacional?`, () => deleteMutation.mutate(m.id))}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================== VISTA FORMULARIO (UNA SOLA COLUMNA, INLINE, ELEGANTE) ==================== */}
        {activeView === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1 } }}
            transition={SPRING_SNAPPY}
            className="max-w-2xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Mensaje de error si ocurre */}
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-700 text-xs font-bold flex items-center gap-2.5 shadow-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{formError}</span>
                </motion.div>
              )}

              {/* Tarjeta Unificada Bento en Una Sola Columna */}
              <motion.div
                whileHover={{ y: -3 }}
                transition={SPRING_FAST}
                className="glass-panel rounded-[2rem] p-5 sm:p-8 space-y-6 sm:space-y-7 border border-white/80"
              >
                {/* Encabezado del Formulario */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-white/60">
                  <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-900">
                      {editingItem ? 'Ficha de Modificación' : 'Ficha de Nuevo Miembro'}
                    </h2>
                    <p className="text-xs font-medium text-slate-400">
                      Información personal y registro de sacramentos en la iglesia
                    </p>
                  </div>
                </div>

                {/* Sección 1: Campos Personales */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Nombre Completo <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Ej. Juan Carlos Pérez Hernández"
                        value={form.nombre}
                        onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                        className="glass-input w-full rounded-2xl px-4 py-3 pl-11 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                      <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha de Nacimiento <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={form.fecha_nacimiento}
                        onChange={(e) => setForm({ ...form, fecha_nacimiento: e.target.value })}
                        className="glass-input w-full rounded-2xl px-4 py-3 pl-11 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                      <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Congregación / Grupo <span className="font-normal normal-case text-slate-400">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ej. Jóvenes, Damas, Coro..."
                        value={form.congregacion}
                        onChange={(e) => setForm({ ...form, congregacion: e.target.value })}
                        className="glass-input w-full rounded-2xl px-4 py-3 pl-11 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                      <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sección 2: Estado Sacramental */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Estado Sacramental
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {/* Tarjeta Bautismo */}
                    <div
                      onClick={() => setForm({ ...form, bautizado: !form.bautizado })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        form.bautizado
                          ? 'bg-sky-50/80 border-sky-300 shadow-xs ring-1 ring-sky-300/60'
                          : 'glass-panel-subtle border-white/80 hover:bg-white/80'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        form.bautizado ? 'bg-sky-500 text-white shadow-2xs' : 'border-2 border-slate-300 bg-white'
                      }`}>
                        {form.bautizado && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-extrabold ${form.bautizado ? 'text-sky-900' : 'text-slate-800'}`}>
                            Bautizado
                          </p>
                          {form.bautizado && (
                            <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-sky-100 text-sky-700 border border-sky-200">
                              Sí
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">
                          Ha recibido el bautismo eclesial.
                        </p>
                      </div>
                    </div>

                    {/* Tarjeta Confirmación */}
                    <div
                      onClick={() => setForm({ ...form, confirmado: !form.confirmado })}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        form.confirmado
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-xs ring-1 ring-emerald-300/60'
                          : 'glass-panel-subtle border-white/80 hover:bg-white/80'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        form.confirmado ? 'bg-emerald-500 text-white shadow-2xs' : 'border-2 border-slate-300 bg-white'
                      }`}>
                        {form.confirmado && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-extrabold ${form.confirmado ? 'text-emerald-900' : 'text-slate-800'}`}>
                            Confirmado
                          </p>
                          {form.confirmado && (
                            <span className="text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Sí
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">
                          Ha realizado rito de confirmación.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones del Formulario */}
                <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="glass-button-secondary w-full sm:w-auto px-6 py-3 rounded-2xl text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancelar y Volver
                  </button>

                  <motion.button
                    type="submit"
                    disabled={isSaving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {isSaving
                      ? 'Guardando...'
                      : editingItem
                        ? 'Guardar Modificaciones'
                        : 'Registrar Miembro'}
                  </motion.button>
                </div>

              </motion.div>

            </form>
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
