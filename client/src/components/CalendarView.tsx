import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { generarPDFActividades } from '../lib/pdfActividades';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';

interface Miembro { id: number; nombre: string; fecha_nacimiento: string; }
interface Actividad { id: number; fecha: string; actividad: string; detalles: string; completado: boolean; }

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function getSemester(date: Date) { return date.getMonth() < 6 ? 1 : 2; }

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return { day: local.getDate(), month: MONTH_NAMES[local.getMonth()], year: local.getFullYear(), dayOfWeek: DAY_NAMES[local.getDay()], obj: local };
}

// Quick presets for common church activities
const ACTIVITY_PRESETS = [
  "Culto Dominical",
  "Reunión de Oración",
  "Estudio Bíblico",
  "Reunión de Jóvenes",
  "Escuela Dominical",
  "Santa Cena",
  "Vigilia / Ayuno"
];

// Helper to determine badge color by category keywords
function getCategoryTag(title: string) {
  const t = title.toLowerCase();
  if (t.includes('culto') || t.includes('dominical')) return { label: 'Culto', bg: 'bg-indigo-50/80', text: 'text-indigo-700', border: 'border-indigo-100' };
  if (t.includes('oración') || t.includes('ayuno') || t.includes('vigilia')) return { label: 'Espiritual', bg: 'bg-purple-50/80', text: 'text-purple-700', border: 'border-purple-100' };
  if (t.includes('jóvenes') || t.includes('juventud')) return { label: 'Jóvenes', bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-100' };
  if (t.includes('escuela') || t.includes('estudio')) return { label: 'Enseñanza', bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-100' };
  if (t.includes('santa cena') || t.includes('bautismo')) return { label: 'Sacramento', bg: 'bg-rose-50/80', text: 'text-rose-700', border: 'border-rose-100' };
  return { label: 'Evento', bg: 'bg-slate-100/80', text: 'text-slate-700', border: 'border-slate-200/80' };
}

// Snappy spring physics
const IOS_SPRING = SPRING_SNAPPY;
const IOS_SPRING_FAST = SPRING_FAST;

// ─── Subcomponent: Agenda Tab (Connected Timeline View) ──────────────────────
function AgendaTab({ actividades, isLoading, isAdmin, initialCreateDate, onClearInitialDate }: {
  actividades: Actividad[] | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  initialCreateDate?: string | null;
  onClearInitialDate?: () => void;
}) {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<'list' | 'form'>('list');
  const [editingItem, setEditingItem] = useState<Actividad | null>(null);
  const [form, setForm]               = useState({ fecha: '', actividad: '', detalles: '' });
  const [formError, setFormError]     = useState('');
  const [deletingId, setDeletingId]   = useState<number | null>(null);
  const [semFilter, setSemFilter]     = useState<1|2>(getSemester(new Date()));
  const [yearFilter, setYearFilter]   = useState(new Date().getFullYear());
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  useEffect(() => {
    if (initialCreateDate) {
      openCreate(initialCreateDate);
      onClearInitialDate?.();
    }
  }, [initialCreateDate]);

  const handleDeleteWithAnim = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
    }, 340);
  };

  const openCreate = (initialDate?: string) => {
    setEditingItem(null);
    setForm({ fecha: initialDate || new Date().toISOString().split('T')[0], actividad: '', detalles: '' });
    setFormError('');
    setActiveView('form');
  };

  const openEdit = (a: Actividad) => {
    const d = new Date(a.fecha);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const yyyy = local.getFullYear();
    const mm   = String(local.getMonth()+1).padStart(2,'0');
    const dd   = String(local.getDate()).padStart(2,'0');
    setEditingItem(a);
    setForm({ fecha: `${yyyy}-${mm}-${dd}`, actividad: a.actividad, detalles: a.detalles || '' });
    setFormError('');
    setActiveView('form');
  };

  const closeForm = () => { setActiveView('list'); setEditingItem(null); };

  const handleSuccessSave = () => {
    queryClient.invalidateQueries({ queryKey: ['actividades'] });
    closeForm();
    setForm({ fecha:'', actividad:'', detalles:'' });
  };

  const crearMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/actividades', data),
    onSuccess: handleSuccessSave,
    onError: () => setFormError('No se pudo crear la actividad.'),
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) => api.put(`/actividades/editar/${id}`, data),
    onSuccess: handleSuccessSave,
    onError: () => setFormError('No se pudo actualizar la actividad.'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, completado }: { id: number; completado: boolean }) => api.put(`/actividades/${id}`, { completado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/actividades/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.fecha || !form.actividad) { setFormError('Fecha y nombre de actividad son obligatorios.'); return; }
    if (editingItem) {
      editarMutation.mutate({ id: editingItem.id, data: form });
    } else {
      crearMutation.mutate(form);
    }
  };
  const isSaving = crearMutation.isPending || editarMutation.isPending;

  const filtered = (actividades || []).filter(a => {
    const d = new Date(a.fecha);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return local.getFullYear() === yearFilter && getSemester(local) === semFilter;
  }).sort((a,b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const grouped: Record<string, Actividad[]> = {};
  filtered.forEach(a => {
    const { month } = formatDateLabel(a.fecha);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(a);
  });

  const total       = filtered.length;
  const done        = filtered.filter(a => a.completado).length;
  const pending     = total - done;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const months      = semFilter === 1 ? ['Enero','Febrero','Marzo','Abril','Mayo','Junio'] : ['Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="space-y-6">

      {/* ── TOPBAR ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {activeView === 'form' ? (
          /* Breadcrumb en modo formulario */
          <div className="flex items-center gap-2">
            <button
              onClick={closeForm}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Agenda
            </button>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-bold text-slate-900">
              {editingItem ? `Editar: ${editingItem.actividad}` : 'Nueva Actividad'}
            </span>
          </div>
        ) : (
          /* Controles de lista */
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            <div className="glass-panel-subtle flex items-center rounded-2xl p-1 gap-1 w-full sm:w-auto">
              {([1,2] as const).map(s => (
                <button key={s} onClick={() => setSemFilter(s)}
                  className={`relative flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-colors text-center cursor-pointer ${
                    semFilter === s ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                  }`}>
                  {semFilter === s && (
                    <motion.div
                      layoutId="activeSemesterBadge"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs"
                      transition={IOS_SPRING_FAST}
                    />
                  )}
                  <span className="relative z-10">{s === 1 ? '1er Semestre' : '2do Semestre'}</span>
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:flex-initial">
              <select value={yearFilter} onChange={e => setYearFilter(Number(e.target.value))}
                className="glass-input w-full sm:w-auto rounded-2xl px-4 py-2 text-xs font-bold text-slate-700 focus:outline-none cursor-pointer appearance-none pr-8">
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
          {activeView === 'list' ? (
            <>
              <button
                onClick={() => generarPDFActividades(filtered, yearFilter, semFilter)}
                disabled={filtered.length === 0}
                className="glass-button-secondary flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl px-3.5 sm:px-4 py-2.5 text-xs font-bold text-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Exportar PDF
              </button>
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={IOS_SPRING_FAST}
                  onClick={() => openCreate()}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nueva Actividad
                </motion.button>
              )}
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={IOS_SPRING_FAST}
              onClick={closeForm}
              className="glass-button-secondary w-full sm:w-auto inline-flex items-center justify-center rounded-2xl text-xs font-bold text-slate-700 h-10 px-5 gap-2 cursor-pointer shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Volver a la Agenda
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ══════════════ VISTA LISTA ══════════════ */}
        {activeView === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10, scale: 0.987 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.987 }}
            transition={IOS_SPRING}
            className="space-y-6"
          >
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div whileHover={{ y: -3, scale: 1.005 }} transition={IOS_SPRING_FAST} className="glass-panel rounded-[1.75rem] p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Total Planificadas</p>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{total}</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{yearFilter} • {semFilter}er Semestre</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -3, scale: 1.005 }} transition={IOS_SPRING_FAST} className="glass-panel rounded-[1.75rem] p-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest">Pendientes</p>
                  <p className="text-2xl font-extrabold text-amber-600 mt-1">{pending}</p>
                  <p className="text-[11px] font-bold text-amber-500 mt-0.5">{total > 0 ? Math.round((pending/total)*100) : 0}% por realizar</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-50/80 border border-amber-100 flex items-center justify-center text-amber-600 shadow-xs">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
              </motion.div>

              <motion.div whileHover={{ y: -3, scale: 1.005 }} transition={IOS_SPRING_FAST} className="glass-panel rounded-[1.75rem] p-5 flex items-center justify-between">
                <div className="w-full pr-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Progreso</p>
                    <span className="text-xs font-extrabold text-emerald-600">{progressPct}%</span>
                  </div>
                  <p className="text-2xl font-extrabold text-emerald-600 mt-1">{done} <span className="text-xs font-bold text-slate-400">/ {total} completadas</span></p>
                  <div className="w-full h-2 rounded-full bg-emerald-100/70 overflow-hidden mt-2 border border-emerald-200/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ ...IOS_SPRING, stiffness: 260, damping: 28 }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Timeline */}
            <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
              {isLoading ? (
                <div className="py-20 text-center text-xs font-medium text-slate-400">Cargando cronograma pastoral...</div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="mx-auto w-16 h-16 rounded-3xl bg-white/80 border border-white flex items-center justify-center mb-4 text-slate-400 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                  <p className="text-base font-extrabold text-slate-800">Sin actividades planificadas</p>
                  <p className="text-xs font-medium text-slate-400 mt-1">No hay eventos registrados para el {semFilter}er semestre de {yearFilter}.</p>
                  {isAdmin && (
                    <button onClick={() => openCreate()} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors">
                      + Crear primera actividad
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-10">
                  {months.map(mName => {
                    const monthActivities = grouped[mName] || [];
                    if (monthActivities.length === 0) return null;
                    const mDone = monthActivities.filter(a => a.completado).length;
                    const mPct  = Math.round((mDone / monthActivities.length) * 100);

                    return (
                      <div key={mName} className="space-y-4">
                        <div className="flex items-center justify-between bg-white/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/80 shadow-xs">
                          <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">{mName}</h3>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-white">
                              {monthActivities.length} {monthActivities.length === 1 ? 'actividad' : 'actividades'}
                            </span>
                          </div>
                          <div className="hidden sm:flex items-center gap-2">
                            <div className="w-24 h-1.5 rounded-full bg-slate-200/80 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mPct}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">{mDone}/{monthActivities.length}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          <AnimatePresence mode="popLayout" initial={false}>
                            {monthActivities.map((a) => {
                              const { day, dayOfWeek } = formatDateLabel(a.fecha);
                              const tag = getCategoryTag(a.actividad);
                              const isDeleting = deletingId === a.id;

                              return (
                                <motion.div
                                  key={a.id}
                                  initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                  animate={isDeleting ? {
                                    opacity: 0, scale: 0.75, y: 20, rotate: -3, filter: "blur(10px)"
                                  } : {
                                    opacity: 1, scale: 1, y: 0, rotate: 0, filter: "blur(0px)"
                                  }}
                                  exit={{ opacity: 0, scale: 0.75, y: 20, filter: "blur(10px)" }}
                                  transition={isDeleting ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] } : IOS_SPRING}
                                  whileHover={!isDeleting ? { y: -3, scale: 1.008 } : {}}
                                  className={`glass-panel rounded-[1.75rem] p-6 flex flex-col justify-between border transition-colors group relative ${
                                    isDeleting
                                      ? 'bg-rose-50/90 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.3)] ring-2 ring-rose-400/50'
                                      : a.completado
                                        ? 'bg-white/40 border-white/60'
                                        : 'bg-white/85 hover:bg-white border-white/95 shadow-[0_4px_24px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-12 py-1.5 rounded-2xl text-center border shadow-2xs ${
                                          a.completado ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-slate-900 text-white border-slate-800'
                                        }`}>
                                          <span className="block text-sm font-black leading-none">{day}</span>
                                          <span className="block text-[9px] font-extrabold uppercase tracking-widest mt-0.5 opacity-80 leading-none">{dayOfWeek}</span>
                                        </div>
                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-xl border ${tag.bg} ${tag.text} ${tag.border}`}>
                                          {tag.label}
                                        </span>
                                      </div>
                                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${
                                        a.completado
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                          : 'bg-amber-50 text-amber-700 border-amber-200/80'
                                      }`}>
                                        {a.completado ? 'Completada' : 'Pendiente'}
                                      </span>
                                    </div>

                                    <h4 className={`text-base font-bold tracking-tight leading-snug mb-1.5 ${
                                      a.completado ? 'line-through text-slate-400' : 'text-slate-900'
                                    }`}>
                                      {a.actividad}
                                    </h4>
                                    {a.detalles && (
                                      <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-3">{a.detalles}</p>
                                    )}
                                  </div>

                                  <div className="pt-4 mt-5 border-t border-slate-100/80 flex items-center justify-between gap-2">
                                    <button
                                      onClick={() => isAdmin && toggleMutation.mutate({ id: a.id, completado: !a.completado })}
                                      disabled={!isAdmin}
                                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all shadow-2xs ${
                                        !isAdmin ? 'opacity-70 cursor-default ' : 'cursor-pointer '
                                      }${
                                        a.completado
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900'
                                      }`}
                                    >
                                      <span className={`w-2 h-2 rounded-full ${a.completado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                      {a.completado ? 'Completada' : 'Marcar completada'}
                                    </button>

                                    {isAdmin && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => openEdit(a)}
                                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                          title="Editar"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                        </button>
                                        <button
                                          onClick={() => confirmAction('Eliminar Actividad', '¿Estás seguro de eliminar esta actividad?', () => handleDeleteWithAnim(a.id))}
                                          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                                          title="Eliminar"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════ VISTA FORMULARIO ══════════════ */}
        {activeView === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.985 }}
            transition={IOS_SPRING}
            className="max-w-xl mx-auto"
          >
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Error */}
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={IOS_SPRING_FAST}
                  className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-700 text-xs font-bold flex items-center gap-2.5 shadow-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{formError}</span>
                </motion.div>
              )}

              {/* Tarjeta principal */}
              <div className="glass-panel rounded-[2rem] p-6 sm:p-8 space-y-6 border border-white/80">

                {/* Header de tarjeta */}
                <div className="flex items-center gap-3.5 pb-4 border-b border-white/60">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs text-lg">
                    📅
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      {editingItem ? 'Editar Actividad' : 'Nueva Actividad'}
                    </h2>
                    <p className="text-xs font-medium text-slate-400">Planificación pastoral congregacional</p>
                  </div>
                </div>

                {/* Fecha */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Fecha <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={form.fecha}
                      onChange={e => setForm({...form, fecha: e.target.value})}
                      className="glass-input w-full rounded-2xl px-4 py-3 pl-11 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                    <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    </div>
                  </div>
                </div>

                {/* Nombre de actividad + presets */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nombre de la Actividad <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative mb-3">
                    <input
                      type="text"
                      required
                      placeholder="Ej. Culto Dominical de Adoración..."
                      value={form.actividad}
                      onChange={e => setForm({...form, actividad: e.target.value})}
                      className="glass-input w-full rounded-2xl px-4 py-3 pl-11 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                    <div className="absolute left-4 top-3.5 text-slate-400 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 10c-.83 0-1.5-.67-1.5-1.5v-5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5z"/><path d="M20.5 10H19V8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/><path d="M9.5 14c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5S8 21.33 8 20.5v-5c0-.83.67-1.5 1.5-1.5z"/><path d="M3.5 14H5v1.5c0 .83-.67 1.5-1.5 1.5S2 16.33 2 15.5 2.67 14 3.5 14z"/><path d="M14 14.5c0-.83.67-1.5 1.5-1.5h5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-5c-.83 0-1.5-.67-1.5-1.5z"/><path d="M15.5 19H14v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5-.67-1.5-1.5-1.5z"/><path d="M10 9.5C10 8.67 9.33 8 8.5 8h-5C2.67 8 2 8.67 2 9.5S2.67 11 3.5 11h5c.83 0 1.5-.67 1.5-1.5z"/><path d="M8.5 5H10V3.5C10 2.67 9.33 2 8.5 2S7 2.67 7 3.5 7.67 5 8.5 5z"/></svg>
                    </div>
                  </div>

                  {/* Preset pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {ACTIVITY_PRESETS.map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setForm({...form, actividad: preset})}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border transition-all shadow-2xs cursor-pointer ${
                          form.actividad === preset
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white/70 text-slate-600 border-white/80 hover:bg-slate-900 hover:text-white hover:border-slate-900'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detalles */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Detalles <span className="font-normal normal-case text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Predicador, pasaje bíblico u observaciones..."
                    value={form.detalles}
                    onChange={e => setForm({...form, detalles: e.target.value})}
                    className="glass-input w-full rounded-2xl px-4 py-3 text-xs font-medium text-slate-900 focus:outline-none resize-none"
                  />
                </div>

                {/* Acciones */}
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
                    transition={IOS_SPRING_FAST}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {isSaving ? 'Guardando...' : editingItem ? 'Guardar Cambios' : 'Crear Actividad'}
                  </motion.button>
                </div>
              </div>
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

// ─── Subcomponent: Calendar Tab (Apple / Fantastical Day Inspector View) ─────
function CalendarTab({ actividades, miembros, isAdmin, onOpenCreateWithDate }: { 
  actividades: Actividad[] | undefined; 
  miembros: Miembro[] | undefined;
  isAdmin: boolean;
  onOpenCreateWithDate: (dateStr: string) => void;
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const year  = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonthToday = today.getFullYear() === year && today.getMonth() === month;

  const changeMonth = (delta: number) => {
    setSlideDirection(delta);
    const nextDate = new Date(year, month + delta, 1);
    setCurrentDate(nextDate);
    setSelectedDay(1);
  };

  const goToToday = () => {
    setSlideDirection(today > currentDate ? 1 : -1);
    setCurrentDate(new Date());
    setSelectedDay(today.getDate());
  };

  // Build array of grid cell items
  const gridCells = [];
  for (let i = 0; i < firstDay; i++) {
    gridCells.push({ isBlank: true, key: `empty-${i}` });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = isCurrentMonthToday && today.getDate() === day;
    const isSelected = selectedDay === day;

    const dayActs = (actividades || []).filter(a => {
      const d = new Date(a.fecha);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return local.getFullYear() === year && local.getMonth() === month && local.getDate() === day;
    });

    const dayBirthdays = (miembros || []).filter(m => {
      if (!m.fecha_nacimiento) return false;
      const d = new Date(m.fecha_nacimiento);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return local.getMonth() === month && local.getDate() === day;
    });

    gridCells.push({
      isBlank: false,
      day,
      isToday,
      isSelected,
      acts: dayActs,
      birthdays: dayBirthdays,
      key: `day-${day}`
    });
  }

  // Active selected day items for the Inspector Card
  const selectedDateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`;
  const selectedActs = (actividades || []).filter(a => {
    const d = new Date(a.fecha);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return local.getFullYear() === year && local.getMonth() === month && local.getDate() === selectedDay;
  });
  const selectedBirthdays = (miembros || []).filter(m => {
    if (!m.fecha_nacimiento) return false;
    const d = new Date(m.fecha_nacimiento);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return local.getMonth() === month && local.getDate() === selectedDay;
  });

  return (
    <div className="space-y-6">
      {/* Calendar Grid Container */}
      <div className="glass-panel rounded-[2rem] overflow-hidden p-6 sm:p-7">
        
        {/* Calendar Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-white/60 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {MONTH_NAMES[month]} <span className="text-slate-400 font-semibold">{year}</span>
            </h2>
            {isCurrentMonthToday && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                Mes Actual
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentMonthToday && (
              <button 
                onClick={goToToday} 
                className="text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-white px-3.5 py-2 rounded-xl transition-all shadow-xs"
              >
                Hoy
              </button>
            )}

            <div className="glass-panel-subtle inline-flex p-1 rounded-2xl gap-1">
              <button 
                onClick={() => changeMonth(-1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-colors"
                title="Mes anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button 
                onClick={() => changeMonth(1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-colors"
                title="Mes siguiente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 text-center">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-1.5 text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Animated Days Grid */}
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div 
            key={`${year}-${month}`}
            custom={slideDirection}
            initial={{ opacity: 0, x: slideDirection * 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: slideDirection * -15, transition: { duration: 0.08 } }}
            transition={SPRING_SNAPPY}
            className="grid grid-cols-7 gap-1 sm:gap-2"
          >
            {gridCells.map((c) => {
              if (c.isBlank) {
                return <div key={c.key} className="min-h-[58px] sm:h-24 rounded-xl sm:rounded-2xl bg-white/10" />;
              }

              return (
                <motion.div
                  key={c.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  transition={SPRING_FAST}
                  onClick={() => setSelectedDay(c.day!)}
                  className={`min-h-[58px] sm:min-h-[96px] p-1 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    c.isSelected 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20' 
                      : c.isToday 
                        ? 'bg-emerald-50/70 border-emerald-200/90 text-slate-900' 
                        : 'bg-white/50 hover:bg-white/90 border-white/70 text-slate-800 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] sm:text-sm font-black rounded-lg w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center ${
                      c.isSelected 
                        ? 'text-white' 
                        : c.isToday 
                          ? 'bg-emerald-500 text-white shadow-xs' 
                          : 'text-slate-800'
                    }`}>
                      {c.day}
                    </span>

                    {/* Micro dot indicators */}
                    <div className="flex items-center gap-1">
                      {c.birthdays && c.birthdays.length > 0 && (
                        <span className="text-[10px]" title="Cumpleaños">🎁</span>
                      )}
                      {c.acts && c.acts.length > 0 && (
                        <span className={`w-2 h-2 rounded-full ${
                          c.isSelected ? 'bg-emerald-400' : 'bg-indigo-500'
                        }`} />
                      )}
                    </div>
                  </div>

                  {/* Desktop Preview Event Pills */}
                  <div className="hidden sm:block space-y-1 overflow-hidden mt-1">
                    {c.acts && c.acts.slice(0, 2).map(a => (
                      <div 
                        key={a.id} 
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate ${
                          c.isSelected 
                            ? 'bg-white/20 text-white' 
                            : a.completado 
                              ? 'bg-slate-100 text-slate-400 line-through' 
                              : 'bg-white text-slate-800 border border-slate-200/60 shadow-2xs'
                        }`}
                      >
                        {a.actividad}
                      </div>
                    ))}
                    {c.acts && c.acts.length > 2 && (
                      <span className={`text-[8px] font-bold block ${c.isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                        +{c.acts.length - 2} más
                      </span>
                    )}
                  </div>

                  {/* Mobile Compact Dots */}
                  <div className="sm:hidden flex items-center justify-center gap-1 mt-0.5">
                    {c.acts && c.acts.length > 0 && (
                      <span className={`w-1.5 h-1.5 rounded-full ${c.isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-6 mt-6 pt-4 border-t border-white/60 text-xs font-semibold text-slate-600">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hoy
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Actividad Programada
          </span>
          <span className="flex items-center gap-2">
            <span>🎁</span> Cumpleaños del día
          </span>
        </div>
      </div>

      {/* Interactive Day Inspector Drawer */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedDay}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={IOS_SPRING}
          className="glass-panel-elevated rounded-[2rem] p-6 sm:p-7"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-white/70 gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-1">
                <span>Inspector del Día</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">
                {selectedDay} de {MONTH_NAMES[month]} {year}
              </h3>
            </div>

            {isAdmin && (
              <motion.button 
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={IOS_SPRING_FAST}
                onClick={() => onOpenCreateWithDate(selectedDateStr)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Agregar Actividad
              </motion.button>
            )}
          </div>

          {selectedActs.length === 0 && selectedBirthdays.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs font-bold text-slate-400">Sin eventos registrados para este día.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Birthdays Section */}
              {selectedBirthdays.map(m => (
                <div key={`bday-inspect-${m.id}`} className="flex items-center gap-3 p-3.5 bg-sky-50/80 border border-sky-200/80 rounded-2xl text-sky-900 shadow-2xs">
                  <span className="text-xl">🎁</span>
                  <div>
                    <p className="text-xs font-extrabold">Cumpleaños de {m.nombre}</p>
                    <p className="text-[10px] font-medium text-sky-700">Congregante de la iglesia</p>
                  </div>
                </div>
              ))}

              {/* Activities Section */}
              {selectedActs.map(a => {
                const tag = getCategoryTag(a.actividad);
                return (
                  <div key={`act-inspect-${a.id}`} className="flex items-center justify-between p-4 bg-white/80 border border-white rounded-2xl shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${a.completado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-extrabold text-slate-900 ${a.completado ? 'line-through text-slate-400' : ''}`}>{a.actividad}</p>
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-lg border ${tag.bg} ${tag.text} ${tag.border}`}>
                            {tag.label}
                          </span>
                        </div>
                        {a.detalles && <p className="text-[11px] font-medium text-slate-500 mt-0.5 truncate">{a.detalles}</p>}
                      </div>
                    </div>

                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-xl border shrink-0 ${
                      a.completado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {a.completado ? 'Completada' : 'Pendiente'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CalendarView() {
  const [activeTab, setActiveTab] = useState<'agenda'|'calendario'>('agenda');
  const [createDateForAgenda, setCreateDateForAgenda] = useState<string | null>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';
  const canWrite = isAdmin || user.permisos?.agenda === 'escritura' || user.permisos?.agenda === 'admin';

  const { data: actividades, isLoading } = useQuery<Actividad[]>({
    queryKey: ['actividades'],
    queryFn: async () => (await api.get('/actividades')).data,
  });

  const { data: miembros } = useQuery<Miembro[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data,
  });

  const handleOpenCreateWithDate = (dateStr?: string) => {
    setCreateDateForAgenda(dateStr || null);
    setActiveTab('agenda');
  };

  return (
    <div className="pb-12 font-sans text-slate-900">
      {/* Dynamic Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Planificación Pastoral</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Agenda Congregacional
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Línea de tiempo interactiva, cronograma anual de eventos, cultos y cumpleaños.
          </p>
        </div>

        {/* Tab Switcher with Framer Motion layoutId */}
        <div className="glass-panel-subtle flex p-1.5 rounded-2xl gap-1 w-full sm:w-auto">
          {(['agenda','calendario'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 sm:flex-initial px-3 sm:px-5 py-2.5 text-xs font-bold transition-colors rounded-xl cursor-pointer text-center ${
                activeTab === tab ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 bg-white rounded-xl shadow-xs"
                  transition={SPRING_FAST}
                />
              )}
              <span className="relative z-10">
                {tab === 'agenda' ? 'Línea de Tiempo' : 'Vista Calendario'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Animated Tab Switcher Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.1, ease: 'easeOut' } }}
          transition={SPRING_SNAPPY}
        >
          {activeTab === 'agenda' ? (
            <AgendaTab 
              actividades={actividades} 
              isLoading={isLoading} 
              isAdmin={canWrite} 
              initialCreateDate={createDateForAgenda}
              onClearInitialDate={() => setCreateDateForAgenda(null)}
            />
          ) : (
            <CalendarTab 
              actividades={actividades} 
              miembros={miembros} 
              isAdmin={canWrite}
              onOpenCreateWithDate={handleOpenCreateWithDate}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

