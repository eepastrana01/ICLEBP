import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { generarPDFActividades } from '../lib/pdfActividades';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { useNavigate } from 'react-router-dom';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';
import { 
  Gift, 
  LayoutTemplate, 
  Check, 
  Search, 
  X, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';
import { Select } from './ui/Select';
import { ActivityModal, getCategoryTag, type Actividad } from './ActivityModal';

interface Miembro { 
  id: number; 
  nombre: string; 
  fecha_nacimiento: string; 
}

const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

function getSemester(date: Date) { return date.getMonth() < 6 ? 1 : 2; }

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  return { 
    day: local.getDate(), 
    month: MONTH_NAMES[local.getMonth()], 
    year: local.getFullYear(), 
    dayOfWeek: DAY_NAMES[local.getDay()], 
    obj: local 
  };
}

// ─── Subcomponent: Agenda Tab (Material Design Chronological Timeline View) ──
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
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [semFilter, setSemFilter] = useState<1|2>(getSemester(new Date()));
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<'pendientes' | 'todas' | 'completadas'>('pendientes');
  const [searchQuery, setSearchQuery] = useState('');
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  const toggleMutation = useMutation({
    mutationFn: ({ id, completado }: { id: number; completado: boolean }) => api.put(`/actividades/${id}`, { completado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/actividades/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

  const handleDeleteWithAnim = (id: number) => {
    setDeletingId(id);
    setTimeout(() => {
      deleteMutation.mutate(id, { onSettled: () => setDeletingId(null) });
    }, 340);
  };

  // 1. Actividades totales de este semestre y año (para KPIs del período y contadores)
  const semesterActivities = useMemo(() => {
    return (actividades || []).filter(a => {
      const d = new Date(a.fecha);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return local.getFullYear() === yearFilter && getSemester(local) === semFilter;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [actividades, yearFilter, semFilter]);

  const totalSemester = semesterActivities.length;
  const doneSemester  = semesterActivities.filter(a => a.completado).length;
  const pendingSemester = totalSemester - doneSemester;
  const progressPct   = totalSemester > 0 ? Math.round((doneSemester / totalSemester) * 100) : 0;

  // 2. Actividades filtradas por estado (Pendientes / Todas / Completadas) y búsqueda
  const filteredActivities = useMemo(() => {
    return semesterActivities.filter(a => {
      if (statusFilter === 'pendientes' && a.completado) return false;
      if (statusFilter === 'completadas' && !a.completado) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = a.actividad.toLowerCase().includes(q);
        const inDetails = (a.detalles || '').toLowerCase().includes(q);
        if (!inTitle && !inDetails) return false;
      }

      return true;
    });
  }, [semesterActivities, statusFilter, searchQuery]);

  // 3. Agrupación por mes para el renderizado del cronograma
  const grouped: Record<string, Actividad[]> = {};
  filteredActivities.forEach(a => {
    const { month } = formatDateLabel(a.fecha);
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(a);
  });

  const months = semFilter === 1 
    ? ['Enero','Febrero','Marzo','Abril','Mayo','Junio'] 
    : ['Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  return (
    <div className="space-y-6">

      {/* ── 1. BARRA SUPERIOR DE CONTROLES ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Selector de Semestre y Año */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <div className="bg-slate-100 flex items-center rounded-2xl p-1 gap-1 w-full sm:w-auto border border-slate-200/80 shadow-2xs">
            {([1, 2] as const).map(s => (
              <button 
                key={s} 
                onClick={() => setSemFilter(s)}
                className={`relative flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-colors text-center cursor-pointer ${
                  semFilter === s ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {semFilter === s && (
                  <motion.div
                    layoutId="activeSemesterBadge"
                    className="absolute inset-0 bg-white rounded-xl shadow-2xs"
                    transition={SPRING_FAST}
                  />
                )}
                <span className="relative z-10">{s === 1 ? '1er Semestre' : '2do Semestre'}</span>
              </button>
            ))}
          </div>

          <Select
            value={yearFilter}
            onChange={(val) => setYearFilter(Number(val))}
            options={[2024, 2025, 2026, 2027, 2028].map(y => ({ value: y, label: String(y) }))}
            className="flex-1 sm:flex-initial min-w-[95px]"
          />
        </div>

        {/* Acciones del Período */}
        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={() => generarPDFActividades(filteredActivities, yearFilter, semFilter)}
            disabled={filteredActivities.length === 0}
            className="shadow-2xs"
            title="Descargar agenda en formato PDF imprimible"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Exportar PDF</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => navigate('/cartelera')}
            className="shadow-2xs gap-1.5"
            title="Diseñar e imprimir cartelera mural para la pizarra de anuncios"
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-slate-600" />
            <span>Cartelera Mensual</span>
          </Button>

          {isAdmin && (
            <Button
              variant="default"
              onClick={() => onOpenCreate()}
              className="shadow-xs gap-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Nueva Actividad</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── 2. TARJETAS DE MÉTRICAS (MATERIAL SURFACE) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {/* KPI 1: Total Planificadas */}
        <Card className="p-5 flex items-center justify-between border border-slate-200/80 shadow-2xs">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Planificadas</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{totalSemester}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{yearFilter} • {semFilter}er Semestre</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shadow-2xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 2: Pendientes por Realizar (Enfoque prioritario) */}
        <Card className="p-5 flex items-center justify-between border border-slate-200/80 shadow-2xs">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Por Realizar</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{pendingSemester}</p>
            <p className="text-[11px] font-bold text-amber-700 mt-0.5">
              {totalSemester > 0 ? Math.round((pendingSemester / totalSemester) * 100) : 0}% pendiente
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 3: Cumplimiento de Agenda */}
        <Card className="p-5 flex items-center justify-between border border-slate-200/80 shadow-2xs">
          <div className="w-full pr-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cumplimiento</p>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                {progressPct}%
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {doneSemester} <span className="text-xs font-semibold text-slate-400">/ {totalSemester} completadas</span>
            </p>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden mt-2 border border-slate-200/60">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </Card>
      </div>

      {/* ── 3. BARRA DE ENFOQUE & BÚSQUEDA (FOCUS MODES) ── */}
      <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pestañas de Enfoque */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('pendientes')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'pendientes'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Pendientes</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              statusFilter === 'pendientes' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingSemester}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('todas')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'todas'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5 text-slate-500" />
            <span>Todas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              statusFilter === 'todas' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {totalSemester}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completadas')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              statusFilter === 'completadas'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Completadas</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
              statusFilter === 'completadas' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {doneSemester}
            </span>
          </button>
        </div>

        {/* Buscador de Actividades */}
        <div className="relative flex-1 max-w-none sm:max-w-xs">
          <input
            type="text"
            placeholder="Buscar actividad o responsable..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-7 text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── 4. CONTENEDOR DEL CRONOGRAMA ── */}
      <Card className="p-5 sm:p-7 shadow-2xs border border-slate-200/80">
        {isLoading ? (
          <div className="py-20 text-center text-xs font-medium text-slate-400">
            Cargando cronograma congregacional...
          </div>
        ) : totalSemester === 0 ? (
          /* Estado cuando no hay actividades en todo el semestre */
          <div className="py-20 text-center">
            <div className="mx-auto w-16 h-16 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4 text-slate-400 shadow-2xs">
              <CalendarIcon className="w-7 h-7" />
            </div>
            <p className="text-base font-black text-slate-900">Sin actividades planificadas</p>
            <p className="text-xs font-medium text-slate-400 mt-1">
              No hay eventos registrados para el {semFilter}er semestre de {yearFilter}.
            </p>
            {isAdmin && (
              <Button onClick={() => onOpenCreate()} className="mt-4 shadow-xs">
                + Crear primera actividad
              </Button>
            )}
          </div>
        ) : filteredActivities.length === 0 ? (
          /* Estado cuando el filtro activo no tiene coincidencias */
          statusFilter === 'pendientes' ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center mb-3 text-emerald-600 shadow-2xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-base font-black text-slate-900">¡Todo al día en este semestre!</p>
              <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
                Todas las actividades planificadas para el {semFilter}er semestre de {yearFilter} han sido completadas.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter('todas')}
                className="mt-4 gap-1.5 shadow-2xs"
              >
                <span>Ver todas las actividades ({totalSemester})</span>
              </Button>
            </div>
          ) : statusFilter === 'completadas' ? (
            <div className="py-16 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400 shadow-2xs">
                <Clock className="w-7 h-7" />
              </div>
              <p className="text-base font-black text-slate-900">Sin actividades completadas aún</p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                A medida que se realicen los eventos, márcalos para archivarlos en esta vista.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter('pendientes')}
                className="mt-4 gap-1.5 shadow-2xs"
              >
                <span>Volver a pendientes ({pendingSemester})</span>
              </Button>
            </div>
          ) : (
            <div className="py-16 text-center">
              <p className="text-base font-black text-slate-900">No se encontraron resultados</p>
              <p className="text-xs font-medium text-slate-500 mt-1">
                No hay actividades que coincidan con "{searchQuery}".
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery('')}
                className="mt-4 shadow-2xs"
              >
                Limpiar búsqueda
              </Button>
            </div>
          )
        ) : (
          /* Listado mensual ordenado */
          <div className="space-y-10">
            {months.map(mName => {
              const monthActivities = grouped[mName] || [];
              if (monthActivities.length === 0) return null;
              const mDone = monthActivities.filter(a => a.completado).length;
              const mPct  = Math.round((mDone / monthActivities.length) * 100);

              return (
                <div key={mName} className="space-y-4">
                  {/* Encabezado del Mes - Superficie Tonal Sutil */}
                  <div className="flex items-center justify-between bg-slate-50/80 px-4 sm:px-5 py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">{mName}</h3>
                      <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/70 shadow-2xs">
                        {monthActivities.length} {monthActivities.length === 1 ? 'actividad' : 'actividades'}
                      </span>
                      {mDone === monthActivities.length && monthActivities.length > 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                          <Check className="w-3 h-3" /> Mes al día
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-200/80 overflow-hidden border border-slate-200/60">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300" 
                          style={{ width: `${mPct}%` }} 
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">{mDone}/{monthActivities.length}</span>
                    </div>
                  </div>

                  {/* Cuadrícula de Tarjetas Material Design */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                    <AnimatePresence mode="popLayout" initial={false}>
                      {monthActivities.map((a) => {
                        const { day, dayOfWeek } = formatDateLabel(a.fecha);
                        const tag = getCategoryTag(a.actividad, a.categoria);
                        const isDeleting = deletingId === a.id;

                        return (
                          <motion.div
                            key={a.id}
                            layout
                            initial={{ opacity: 0, y: 8, scale: 0.98 }}
                            animate={isDeleting ? {
                              opacity: 0, scale: 0.8, y: 15, filter: "blur(6px)"
                            } : {
                              opacity: 1, scale: 1, y: 0, filter: "blur(0px)"
                            }}
                            exit={{ opacity: 0, scale: 0.8, y: 15, filter: "blur(6px)" }}
                            transition={isDeleting ? { duration: 0.25 } : SPRING_SNAPPY}
                            className={`rounded-2xl p-5 flex flex-col justify-between border transition-all duration-200 relative group ${
                              isDeleting
                                ? 'bg-rose-50 border-rose-300 shadow-xs'
                                : a.completado
                                  ? 'bg-slate-50/70 border-slate-200/70 opacity-80 hover:opacity-100 shadow-2xs'
                                  : 'bg-white hover:bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                            }`}
                          >
                            <div>
                              {/* Fila Superior: Fecha + Categoría Tonal + Checkbox Táctil */}
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {/* Chip de Fecha */}
                                  <div className={`px-2.5 py-1 rounded-xl text-center border shrink-0 transition-colors ${
                                    a.completado
                                      ? 'bg-slate-100/80 border-slate-200/60 text-slate-400'
                                      : 'bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
                                  }`}>
                                    <span className="block text-sm font-black leading-none">{day}</span>
                                    <span className="block text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-75 leading-none">{dayOfWeek}</span>
                                  </div>

                                  {/* Chip de Categoría Tonal con punto de color */}
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200/70 text-slate-700 text-[10px] font-bold truncate">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tag.dot}`} />
                                    <span className="truncate">{tag.label}</span>
                                  </span>
                                </div>

                                {/* Checkbox Táctil Material Design */}
                                <button
                                  type="button"
                                  onClick={() => isAdmin && toggleMutation.mutate({ id: a.id, completado: !a.completado })}
                                  disabled={!isAdmin}
                                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                    !isAdmin ? 'opacity-60 cursor-default' : 'cursor-pointer active:scale-90'
                                  } ${
                                    a.completado
                                      ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                      : 'border-2 border-slate-300 hover:border-slate-600 hover:bg-slate-100 text-transparent hover:text-slate-400'
                                  }`}
                                  title={!isAdmin ? (a.completado ? 'Completada' : 'Pendiente') : (a.completado ? 'Marcar como pendiente' : 'Marcar como completada')}
                                >
                                  <Check className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              </div>

                              {/* Título de la Actividad */}
                              <h4 className={`text-sm sm:text-base font-bold tracking-tight leading-snug mb-1.5 ${
                                a.completado ? 'line-through text-slate-400 font-medium' : 'text-slate-900'
                              }`}>
                                {a.actividad}
                              </h4>

                              {/* Detalles / Notas */}
                              {a.detalles && (
                                <p className={`text-xs font-medium leading-relaxed whitespace-pre-line line-clamp-3 ${
                                  a.completado ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                  {a.detalles}
                                </p>
                              )}
                            </div>

                            {/* Pie de Tarjeta: Estado Sobrio y Acciones de Edición */}
                            <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                                a.completado ? 'text-emerald-700' : 'text-slate-500'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${a.completado ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                <span>{a.completado ? 'Completada' : 'Pendiente'}</span>
                              </span>

                              {isAdmin && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onOpenEdit(a)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Editar actividad"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  </button>
                                  <button
                                    onClick={() => confirmAction('Eliminar Actividad', '¿Estás seguro de eliminar esta actividad?', () => handleDeleteWithAnim(a.id))}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Eliminar actividad"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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
      </Card>

      {/* Modal de confirmación para eliminar */}
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

// ─── Subcomponent: Calendar Tab (Material Day Inspector View) ────────────────
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
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [slideDirection, setSlideDirection] = useState<number>(1);

  const toggleMutation = useMutation({
    mutationFn: ({ id, completado }: { id: number; completado: boolean }) => api.put(`/actividades/${id}`, { completado }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['actividades'] }),
  });

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

  // Construcción de celdas de la cuadrícula mensual
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
      {/* Contenedor del Calendario */}
      <Card className="overflow-hidden p-5 sm:p-7 shadow-2xs border border-slate-200/80">
        
        {/* Cabecera del Calendario */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {MONTH_NAMES[month]} <span className="text-slate-400 font-semibold">{year}</span>
            </h2>
            {isCurrentMonthToday && (
              <Badge variant="secondary" className="text-[10px]">
                Mes Actual
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCurrentMonthToday && (
              <Button 
                variant="outline"
                size="sm"
                onClick={goToToday} 
                className="shadow-2xs"
              >
                Hoy
              </Button>
            )}

            <div className="bg-slate-100 inline-flex p-1 rounded-2xl gap-1 border border-slate-200/80 shadow-2xs">
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

        {/* Días de la Semana */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-2 text-center">
          {DAY_NAMES.map(d => (
            <div key={d} className="py-1.5 text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Cuadrícula de Días Animada */}
        <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div 
            key={`${year}-${month}`}
            custom={slideDirection}
            initial={{ opacity: 0, x: slideDirection * 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -slideDirection * 20 }}
            transition={SPRING_FAST}
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
                      ? 'bg-white shadow-xs border-slate-900 ring-2 ring-slate-900/10' 
                      : cell.isToday
                        ? 'bg-slate-50 border-slate-300 shadow-2xs hover:bg-white'
                        : 'bg-white/80 hover:bg-white border-slate-200/70 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-black leading-none ${
                      cell.isSelected 
                        ? 'text-slate-900' 
                        : cell.isToday 
                          ? 'text-slate-900' 
                          : 'text-slate-700'
                    }`}>
                      {cell.day}
                    </span>

                    {cell.isToday && (
                      <span className="px-1.5 py-0.2 rounded-md bg-slate-900 text-white text-[8px] font-black uppercase tracking-wider">
                        Hoy
                      </span>
                    )}
                  </div>

                  {/* Etiquetas de Actividades y Cumpleaños */}
                  <div className="space-y-1 mt-1">
                    {hasActs && (
                      <div className="space-y-1">
                        {(cell.acts || []).slice(0, 2).map(a => {
                          const tag = getCategoryTag(a.actividad, a.categoria);
                          return (
                            <div 
                              key={a.id} 
                              className={`hidden sm:flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md border truncate leading-tight ${
                                a.completado
                                  ? 'bg-slate-100/70 border-slate-200/60 text-slate-400 line-through'
                                  : 'bg-slate-50 border-slate-200/80 text-slate-700'
                              }`}
                            >
                              <span className={`w-1 h-1 rounded-full shrink-0 ${tag.dot}`} />
                              <span className="truncate">{a.actividad}</span>
                            </div>
                          );
                        })}
                        {/* Puntos en móvil */}
                        <div className="sm:hidden flex items-center gap-1 flex-wrap">
                          {(cell.acts || []).map(a => {
                            const tag = getCategoryTag(a.actividad, a.categoria);
                            return (
                              <span 
                                key={a.id} 
                                className={`w-1.5 h-1.5 rounded-full ${a.completado ? 'bg-slate-300' : tag.dot}`} 
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {hasBdays && (
                      <div className="flex items-center text-sky-600">
                        <Gift className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {/* Leyenda Sutil */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-6 pt-5 border-t border-slate-100 text-xs font-semibold text-slate-500">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-900" /> Día actual (Hoy)
          </span>
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Actividad programada
          </span>
          <span className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5 text-sky-600" /> Cumpleaños registrado
          </span>
        </div>
      </Card>

      {/* Inspector del Día Seleccionado (Material Card Treatment) */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={selectedDay}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={SPRING_SNAPPY}
        >
          <Card className="p-5 sm:p-7 shadow-2xs border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-3">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span>Inspector del Día</span>
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedDay} de {MONTH_NAMES[month]} {year}
                </h3>
              </div>

              {isAdmin && (
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => onOpenCreateWithDate(selectedDateStr)}
                  className="shadow-xs gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <span>Agregar Actividad</span>
                </Button>
              )}
            </div>

            {selectedActs.length === 0 && selectedBirthdays.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs font-semibold text-slate-400">Sin eventos registrados para este día.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Sección de Cumpleaños */}
                {selectedBirthdays.map(m => (
                  <div key={`bday-inspect-${m.id}`} className="flex items-center gap-3 p-3.5 bg-sky-50/70 border border-sky-200/70 rounded-2xl text-sky-900 shadow-2xs">
                    <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                      <Gift className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold">Cumpleaños de {m.nombre}</p>
                      <p className="text-[10px] font-medium text-sky-700">Congregante de la iglesia</p>
                    </div>
                  </div>
                ))}

                {/* Sección de Actividades con Checkbox Táctil */}
                {selectedActs.map(a => {
                  const tag = getCategoryTag(a.actividad, a.categoria);
                  return (
                    <div 
                      key={`act-inspect-${a.id}`} 
                      className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${
                        a.completado ? 'bg-slate-50/70 border-slate-200/70 opacity-80' : 'bg-white border-slate-200/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1 pr-3">
                        <button
                          type="button"
                          onClick={() => isAdmin && toggleMutation.mutate({ id: a.id, completado: !a.completado })}
                          disabled={!isAdmin}
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            !isAdmin ? 'opacity-60 cursor-default' : 'cursor-pointer active:scale-90'
                          } ${
                            a.completado
                              ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                              : 'border-2 border-slate-300 hover:border-slate-500 hover:bg-slate-100 text-transparent hover:text-slate-400'
                          }`}
                          title={a.completado ? 'Marcar como pendiente' : 'Marcar como completada'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-xs sm:text-sm font-bold text-slate-900 ${a.completado ? 'line-through text-slate-400 font-medium' : ''}`}>
                              {a.actividad}
                            </p>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/70 text-slate-700 text-[10px] font-bold">
                              <span className={`w-1.5 h-1.5 rounded-full ${tag.dot}`} />
                              <span>{tag.label}</span>
                            </span>
                          </div>
                          {a.detalles && (
                            <p className="text-[11px] font-medium text-slate-500 mt-1 whitespace-pre-line leading-relaxed">
                              {a.detalles}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isAdmin && onOpenEdit && (
                          <button
                            onClick={() => onOpenEdit(a)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Editar actividad"
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
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component: CalendarView ────────────────────────────────────────────
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
      {/* Header Institucional Limpio */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Planificación &bull; ICLEB
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Agenda Pastoral
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Cronograma operativo de asambleas, cultos, aseos y actividades de la congregación.
          </p>
        </div>

        {/* Selector de Pestañas: Línea de Tiempo vs Calendario */}
        <div className="bg-slate-100 flex p-1 rounded-2xl gap-1 border border-slate-200/80 shadow-2xs w-full sm:w-auto">
          {(['agenda','calendario'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 sm:flex-initial px-3 sm:px-5 py-2 text-xs font-bold transition-colors rounded-xl cursor-pointer text-center ${
                activeTab === tab ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTabBadge"
                  className="absolute inset-0 bg-white rounded-xl shadow-2xs"
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

      {/* Contenedor Animado de Pestañas */}
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

      {/* Modal Administrativo de Creación y Edición */}
      <ActivityModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingItem={editingItem}
        initialDate={initialDate}
      />
    </div>
  );
}
