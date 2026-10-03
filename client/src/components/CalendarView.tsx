import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { generarPDFActividades } from '../lib/pdfActividades';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';
import { Gift } from 'lucide-react';
import { ActivityModal, getCategoryTag, type Actividad } from './ActivityModal';

interface Miembro { id: number; nombre: string; fecha_nacimiento: string; }

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function getSemester(date: Date) { return date.getMonth() < 6 ? 1 : 2; }

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return { day: local.getDate(), month: MONTH_NAMES[local.getMonth()], year: local.getFullYear(), dayOfWeek: DAY_NAMES[local.getDay()], obj: local };
}

// Snappy spring physics
const IOS_SPRING = SPRING_SNAPPY;
const IOS_SPRING_FAST = SPRING_FAST;

// ─── Subcomponent: Agenda Tab (Connected Timeline View) ──────────────────────
function AgendaTab({
  actividades,
  isLoading,
  isAdmin,
  onOpenCreate,
  onOpenEdit
}: {
  actividades: Actividad[] | undefined;
  isLoading: boolean;
  isAdmin: boolean;
  onOpenCreate: (initialDate?: string) => void;
  onOpenEdit: (item: Actividad) => void;
}) {
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [semFilter, setSemFilter] = useState<1|2>(getSemester(new Date()));
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  const handleDeleteWithAnim = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
    }, 340);
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, completado }: { id: number; completado: boolean }) => api.put(`/actividades/${id}`, { completado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/actividades/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

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
        {/* Controles de lista */}
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

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
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
              onClick={() => onOpenCreate()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 sm:px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Nueva Actividad
            </motion.button>
          )}
        </div>
      </div>

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
          <div className="py-20 text-center text-xs font-medium text-slate-400">Cargando cronograma congregacional...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-white/80 border border-white flex items-center justify-center mb-4 text-slate-400 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <p className="text-base font-extrabold text-slate-800">Sin actividades planificadas</p>
            <p className="text-xs font-medium text-slate-400 mt-1">No hay eventos registrados para el {semFilter}er semestre de {yearFilter}.</p>
            {isAdmin && (
              <button onClick={() => onOpenCreate()} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer">
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
                                <p className="text-xs font-medium text-slate-500 leading-relaxed line-clamp-3 whitespace-pre-line">{a.detalles}</p>
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
                                    onClick={() => onOpenEdit(a)}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Editar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button
                                    onClick={() => confirmAction('Eliminar Actividad', '¿Estás seguro de eliminar esta actividad?', () => handleDeleteWithAnim(a.id))}
                                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
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
function CalendarTab({
  actividades,
  miembros,
  isAdmin,
  onOpenCreateWithDate,
  onOpenEdit
}: { 
  actividades: Actividad[] | undefined; 
  miembros: Miembro[] | undefined;
  isAdmin: boolean;
  onOpenCreateWithDate: (dateStr: string) => void;
  onOpenEdit?: (item: Actividad) => void;
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
                className="text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-white px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Hoy
              </button>
            )}

            <div className="glass-panel-subtle inline-flex p-1 rounded-2xl gap-1">
              <button 
                onClick={() => changeMonth(-1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-colors cursor-pointer"
                title="Mes anterior"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <button 
                onClick={() => changeMonth(1)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:bg-white transition-colors cursor-pointer"
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
            initial={{ opacity: 0, x: slideDirection * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -slideDirection * 20 }}
            transition={IOS_SPRING_FAST}
            className="grid grid-cols-7 gap-1.5 sm:gap-2.5"
          >
            {gridCells.map(cell => {
              if (cell.isBlank) {
                return <div key={cell.key} className="min-h-[85px] sm:min-h-[105px] rounded-2xl bg-slate-50/30 border border-transparent" />;
              }

              const hasActs = (cell.acts || []).length > 0;
              const hasBdays = (cell.birthdays || []).length > 0;

              return (
                <motion.div
                  key={cell.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => cell.day && setSelectedDay(cell.day)}
                  className={`min-h-[85px] sm:min-h-[105px] p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    cell.isSelected 
                      ? 'bg-white shadow-[0_8px_30px_rgba(99,102,241,0.12)] border-indigo-400 ring-2 ring-indigo-400/20' 
                      : cell.isToday
                        ? 'bg-emerald-50/50 border-emerald-200/90 shadow-2xs hover:bg-white'
                        : 'bg-white/60 hover:bg-white border-white/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-black leading-none ${
                      cell.isSelected 
                        ? 'text-indigo-600' 
                        : cell.isToday 
                          ? 'text-emerald-700' 
                          : 'text-slate-800'
                    }`}>
                      {cell.day}
                    </span>

                    {cell.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                    )}
                  </div>

                  {/* Indicator badges / dots */}
                  <div className="space-y-1 mt-1">
                    {hasActs && (
                      <div className="space-y-1">
                        {(cell.acts || []).slice(0, 2).map(a => {
                          const tag = getCategoryTag(a.actividad);
                          return (
                            <div 
                              key={a.id} 
                              className={`hidden sm:block text-[9px] font-bold px-1.5 py-0.5 rounded-lg border truncate leading-tight ${tag.bg} ${tag.text} ${tag.border}`}
                            >
                              {a.actividad}
                            </div>
                          );
                        })}
                        {/* Mobile dots view */}
                        <div className="sm:hidden flex items-center gap-1 flex-wrap">
                          {(cell.acts || []).map(a => (
                            <span 
                              key={a.id} 
                              className={`w-2 h-2 rounded-full ${a.completado ? 'bg-emerald-400' : 'bg-indigo-500'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {hasBdays && (
                      <div className="flex items-center text-sky-500">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-5 border-t border-slate-100 text-xs font-bold text-slate-500">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Hoy
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" /> Actividad Programada
          </span>
          <span className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5 text-sky-500" /> Cumpleaños del día
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
                  <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
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

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-xl border shrink-0 ${
                        a.completado ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {a.completado ? 'Completada' : 'Pendiente'}
                      </span>
                      {isAdmin && onOpenEdit && (
                        <button
                          onClick={() => onOpenEdit(a)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      )}
                    </div>
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Actividad | null>(null);
  const [initialDate, setInitialDate] = useState<string>('');

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

  const handleOpenCreate = (dateStr?: string) => {
    setEditingItem(null);
    setInitialDate(dateStr || new Date().toISOString().split('T')[0]);
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Actividad) => {
    setEditingItem(item);
    setInitialDate(item.fecha);
    setModalOpen(true);
  };

  return (
    <div className="pb-12 font-sans text-slate-900">
      {/* Dynamic Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Planificación Congregacional</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Agenda de Actividades
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Cronograma operativo de aseos, rifas, kermesses, asambleas y celebraciones congregacionales.
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
              onOpenCreate={handleOpenCreate}
              onOpenEdit={handleOpenEdit}
            />
          ) : (
            <CalendarTab 
              actividades={actividades} 
              miembros={miembros} 
              isAdmin={canWrite}
              onOpenCreateWithDate={handleOpenCreate}
              onOpenEdit={handleOpenEdit}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modern Administrative Activity Modal */}
      <ActivityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        initialDate={initialDate}
      />
    </div>
  );
}
