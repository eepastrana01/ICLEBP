import { useState, useMemo, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';
import { generarPDFEvento } from '../lib/pdfEventos';

interface EventoResumen {
  total_participantes: number;
  total_boletos: number;
  total_recaudado: number;
  total_pendiente: number;
  total_proyectado: number;
  boletos_entregados: number;
  boletos_no_entregados: number;
  porcentaje_recaudado: number;
  porcentaje_entregado: number;
}

interface Evento {
  id: number;
  nombre: string;
  descripcion?: string | null;
  tipo: string;
  precio_boleto: number;
  fecha_evento?: string | null;
  meta_recaudacion?: number | null;
  activo: boolean;
  created_at: string;
  resumen?: EventoResumen;
}

interface Participante {
  id: number;
  evento_id: number;
  nombre_persona: string;
  telefono?: string | null;
  cantidad_boletos: number;
  numeros_boletos?: string | null;
  monto_total: number;
  pagado: boolean;
  entregado: boolean;
  notas?: string | null;
  created_at: string;
}

export default function EventsView() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';
  const canWrite = isAdmin || user.permisos?.eventos === 'escritura' || user.permisos?.eventos === 'admin' || (user.permisos?.eventos === undefined && user.rol !== 'invitado' && user.rol !== 'fiscal');
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  // Estado del Evento Activo Seleccionado
  const [selectedEventoId, setSelectedEventoId] = useState<number | null>(null);

  // Filtros y Búsqueda de Participantes
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendientes_pago' | 'pagados' | 'pendientes_entrega' | 'entregados'>('todos');

  // Modales
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Evento | null>(null);
  const [eventForm, setEventForm] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'rifa',
    precio_boleto: 50,
    meta_recaudacion: '',
    fecha_evento: ''
  });
  const [eventFormError, setEventFormError] = useState('');

  // Modal para editar participante existente
  const [editingParticipante, setEditingParticipante] = useState<Participante | null>(null);

  // Formulario de Registro Rápido (Quick-Add) - 100% manual
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [quickForm, setQuickForm] = useState({
    nombre_persona: '',
    cantidad_boletos: 1,
    numeros_boletos: '',
    pagado: false,
    entregado: false
  });
  const [quickSavedToast, setQuickSavedToast] = useState<string | null>(null);

  // ==================== QUERIES ====================
  const { data: eventos = [], isLoading: isLoadingEventos } = useQuery<Evento[]>({
    queryKey: ['eventos'],
    queryFn: async () => (await api.get('/eventos')).data
  });

  // Determinar evento activo por defecto
  const activeEvento = useMemo(() => {
    if (eventos.length === 0) return null;
    if (selectedEventoId) {
      const found = eventos.find(e => e.id === selectedEventoId);
      if (found) return found;
    }
    return eventos[0];
  }, [eventos, selectedEventoId]);

  const activeEventoId = activeEvento?.id || null;

  const { data: participantes = [], isLoading: isLoadingParticipantes } = useQuery<Participante[]>({
    queryKey: ['eventos', activeEventoId, 'participantes'],
    queryFn: async () => {
      if (!activeEventoId) return [];
      return (await api.get(`/eventos/${activeEventoId}/participantes`)).data;
    },
    enabled: !!activeEventoId
  });

  // ==================== MUTACIONES ====================
  const createEventoMutation = useMutation({
    mutationFn: (data: typeof eventForm) => api.post('/eventos', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      setSelectedEventoId(res.data.id);
      setIsEventModalOpen(false);
      resetEventForm();
    },
    onError: (err: any) => setEventFormError(err.response?.data?.error || 'Error al guardar actividad')
  });

  const updateEventoMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof eventForm }) => api.put(`/eventos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      setIsEventModalOpen(false);
      resetEventForm();
    },
    onError: (err: any) => setEventFormError(err.response?.data?.error || 'Error al actualizar actividad')
  });

  const deleteEventoMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/eventos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      setSelectedEventoId(null);
    }
  });

  const quickAddMutation = useMutation({
    mutationFn: (data: any) => api.post('/eventos/participantes', data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
      
      const nombre = res.data.nombre_persona;
      const cant = res.data.cantidad_boletos;
      setQuickSavedToast(`¡${nombre} (${cant} ${cant === 1 ? 'boleto' : 'boletos'}) registrado!`);
      setTimeout(() => setQuickSavedToast(null), 3000);

      // Limpiar formulario y reenfocar de inmediato para el siguiente
      setQuickForm({
        nombre_persona: '',
        cantidad_boletos: 1,
        numeros_boletos: '',
        pagado: false,
        entregado: false
      });
      nameInputRef.current?.focus();
    }
  });

  const togglePagoMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/eventos/participantes/${id}/toggle-pago`),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
      const previousParticipantes = queryClient.getQueryData<Participante[]>(['eventos', activeEventoId, 'participantes']);

      queryClient.setQueryData<Participante[]>(['eventos', activeEventoId, 'participantes'], (old) => {
        if (!old) return [];
        return old.map(p => p.id === id ? { ...p, pagado: !p.pagado } : p);
      });

      return { previousParticipantes };
    },
    onError: (_err, _id, context) => {
      if (context?.previousParticipantes) {
        queryClient.setQueryData(['eventos', activeEventoId, 'participantes'], context.previousParticipantes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
    }
  });

  const toggleEntregaMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/eventos/participantes/${id}/toggle-entrega`),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
      const previousParticipantes = queryClient.getQueryData<Participante[]>(['eventos', activeEventoId, 'participantes']);

      queryClient.setQueryData<Participante[]>(['eventos', activeEventoId, 'participantes'], (old) => {
        if (!old) return [];
        return old.map(p => p.id === id ? { ...p, entregado: !p.entregado } : p);
      });

      return { previousParticipantes };
    },
    onError: (_err, _id, context) => {
      if (context?.previousParticipantes) {
        queryClient.setQueryData(['eventos', activeEventoId, 'participantes'], context.previousParticipantes);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
    }
  });

  const updateParticipanteMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/eventos/participantes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
      setEditingParticipante(null);
    }
  });

  const deleteParticipanteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/eventos/participantes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos'] });
      queryClient.invalidateQueries({ queryKey: ['eventos', activeEventoId, 'participantes'] });
    }
  });

  // ==================== HANDLERS ====================
  const resetEventForm = () => {
    setEditingEvento(null);
    setEventForm({
      nombre: '',
      descripcion: '',
      tipo: 'rifa',
      precio_boleto: 50,
      meta_recaudacion: '',
      fecha_evento: ''
    });
    setEventFormError('');
  };

  const openCreateEvent = () => {
    resetEventForm();
    setIsEventModalOpen(true);
  };

  const openEditEvent = (ev: Evento) => {
    setEditingEvento(ev);
    let fechaStr = '';
    if (ev.fecha_evento) {
      fechaStr = ev.fecha_evento.split('T')[0];
    }
    setEventForm({
      nombre: ev.nombre,
      descripcion: ev.descripcion || '',
      tipo: ev.tipo || 'rifa',
      precio_boleto: ev.precio_boleto || 0,
      meta_recaudacion: ev.meta_recaudacion ? String(ev.meta_recaudacion) : '',
      fecha_evento: fechaStr
    });
    setEventFormError('');
    setIsEventModalOpen(true);
  };

  const handleEventFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setEventFormError('');
    if (!eventForm.nombre.trim()) {
      setEventFormError('El nombre de la actividad o rifa es obligatorio.');
      return;
    }
    if (editingEvento) {
      updateEventoMutation.mutate({ id: editingEvento.id, data: eventForm });
    } else {
      createEventoMutation.mutate(eventForm);
    }
  };

  const handleQuickAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!activeEventoId) return;
    if (!quickForm.nombre_persona.trim()) return;

    const precio = activeEvento?.precio_boleto || 0;
    const total = quickForm.cantidad_boletos * precio;

    quickAddMutation.mutate({
      evento_id: activeEventoId,
      nombre_persona: quickForm.nombre_persona.trim(),
      cantidad_boletos: quickForm.cantidad_boletos,
      numeros_boletos: quickForm.numeros_boletos.trim() || null,
      monto_total: total,
      pagado: quickForm.pagado,
      entregado: quickForm.entregado
    });
  };

  // Filtrado de participantes
  const filteredParticipantes = useMemo(() => {
    let list = participantes;

    if (filterStatus === 'pendientes_pago') {
      list = list.filter(p => !p.pagado);
    } else if (filterStatus === 'pagados') {
      list = list.filter(p => p.pagado);
    } else if (filterStatus === 'pendientes_entrega') {
      list = list.filter(p => !p.entregado);
    } else if (filterStatus === 'entregados') {
      list = list.filter(p => p.entregado);
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase().trim();
    return list.filter(p =>
      p.nombre_persona.toLowerCase().includes(q) ||
      (p.numeros_boletos && p.numeros_boletos.toLowerCase().includes(q)) ||
      (p.telefono && p.telefono.includes(q))
    );
  }, [participantes, filterStatus, searchTerm]);

  // Totales en vivo para el evento actual (calculados dinámicamente en tiempo real)
  const resumen = useMemo(() => {
    const total_participantes = participantes.length;
    const total_boletos = participantes.reduce((acc, p) => acc + (p.cantidad_boletos || 0), 0);
    const total_recaudado = participantes.filter(p => p.pagado).reduce((acc, p) => acc + (Number(p.monto_total) || 0), 0);
    const total_pendiente = participantes.filter(p => !p.pagado).reduce((acc, p) => acc + (Number(p.monto_total) || 0), 0);
    const total_proyectado = total_recaudado + total_pendiente;
    const boletos_entregados = participantes.filter(p => p.entregado).reduce((acc, p) => acc + (p.cantidad_boletos || 0), 0);
    const boletos_no_entregados = Math.max(0, total_boletos - boletos_entregados);
    const porcentaje_recaudado = total_proyectado > 0 ? Math.round((total_recaudado / total_proyectado) * 100) : 0;
    const porcentaje_entregado = total_boletos > 0 ? Math.round((boletos_entregados / total_boletos) * 100) : 0;

    return {
      total_participantes,
      total_boletos,
      total_recaudado,
      total_pendiente,
      total_proyectado,
      boletos_entregados,
      boletos_no_entregados,
      porcentaje_recaudado,
      porcentaje_entregado
    };
  }, [participantes]);

  // Manejador de descarga PDF
  const handleExportPDF = () => {
    if (!activeEvento) return;
    generarPDFEvento(activeEvento, participantes);
  };

  return (
    <div className="pb-16 font-sans text-slate-900">

      {/* ========== TOPBAR PRINCIPAL ========== */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Actividades &bull; Recaudación
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Rifas & Eventos Pro-Templo
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Control digital de boletos, subastas, pagos y entregas sin necesidad de papel.
          </p>
        </div>

        {/* Acciones del Topbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto">
          {/* Selector de Evento */}
          {eventos.length > 0 && (
            <div className="relative flex-1 sm:flex-none min-w-[170px]">
              <select
                value={activeEventoId || ''}
                onChange={(e) => setSelectedEventoId(parseInt(e.target.value))}
                className="glass-input w-full sm:w-auto h-10 rounded-2xl pl-3 pr-8 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer appearance-none shadow-2xs"
              >
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nombre} (L. {Number(ev.precio_boleto).toFixed(0)})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
          )}

          {/* Botón Descargar PDF */}
          {activeEvento && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_FAST}
              onClick={handleExportPDF}
              className="h-10 px-3 sm:px-4 rounded-2xl bg-white/90 hover:bg-white text-slate-700 border border-white/80 shadow-xs text-xs font-bold inline-flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer select-none active:scale-95"
              title="Descargar reporte completo en tamaño carta"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span className="hidden sm:inline">Descargar</span> <span>PDF</span>
            </motion.button>
          )}

          {/* Botón Editar Actividad Actual */}
          {canWrite && activeEvento && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_FAST}
              onClick={() => openEditEvent(activeEvento)}
              className="h-10 px-3 rounded-2xl bg-white/70 hover:bg-white text-slate-600 border border-white/80 shadow-2xs text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none active:scale-95"
              title="Editar configuración de esta actividad"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </motion.button>
          )}

          {/* Botón Eliminar Actividad Actual */}
          {canWrite && activeEvento && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_FAST}
              onClick={() => confirmAction(
                'Eliminar Actividad',
                `¿Estás seguro de eliminar la actividad "${activeEvento.nombre}" y todos sus boletos registrados? Esta acción no se puede deshacer.`,
                () => deleteEventoMutation.mutate(activeEvento.id)
              )}
              className="h-10 px-3 rounded-2xl bg-white/70 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-white/80 shadow-2xs text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none active:scale-95"
              title="Eliminar esta actividad"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4h6v2"></path></svg>
            </motion.button>
          )}

          {/* Botón Nueva Actividad */}
          {canWrite && (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={SPRING_FAST}
              onClick={openCreateEvent}
              className="h-10 px-3.5 sm:px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-[0_4px_14px_rgba(15,23,42,0.18)] text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer select-none active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Nueva Actividad</span>
            </motion.button>
          )}
        </div>
      </div>

      {isLoadingEventos ? (
        <div className="glass-panel rounded-[2rem] p-16 text-center">
          <p className="text-xs font-semibold text-slate-400">Cargando actividades y rifas...</p>
        </div>
      ) : eventos.length === 0 ? (
        /* Estado vacío cuando no hay actividades creadas */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING_SNAPPY}
          className="glass-panel-elevated rounded-[2.5rem] p-12 sm:p-16 text-center max-w-lg mx-auto space-y-5"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><line x1="9" y1="15" x2="9.01" y2="15"/><line x1="15" y1="15" x2="15.01" y2="15"/></svg>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">No hay actividades activas</h2>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto">
              Crea tu primera rifa, subasta o colecta para empezar a asignar boletos a las personas y controlar cobros de forma moderna.
            </p>
          </div>
          {canWrite && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={openCreateEvent}
              className="px-6 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-md hover:bg-slate-800 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Crear Primera Actividad
            </motion.button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-5 sm:space-y-6">

          {/* ========== 1. PANEL DE MÉTRICAS KPIS (RESPONSIVO EN MÓVIL) ========== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            
            {/* KPI 1: Boletos Asignados */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={SPRING_FAST}
              className="glass-panel rounded-2xl p-3 sm:p-4 flex items-center justify-between h-[84px] sm:h-[90px] cursor-default"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">Boletos</p>
                <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1 sm:mt-1.5 leading-tight truncate">
                  {resumen.total_boletos}
                </p>
                <p className="text-[10px] font-bold text-slate-500 mt-0.5 leading-none truncate">
                  {resumen.total_participantes} {resumen.total_participantes === 1 ? 'comprador' : 'compradores'}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/></svg>
              </div>
            </motion.div>

            {/* KPI 2: Total Cobrado / Pagado */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={SPRING_FAST}
              className="glass-panel rounded-2xl p-3 sm:p-4 flex items-center justify-between h-[84px] sm:h-[90px] cursor-default"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest leading-none">Recaudado</p>
                <p className="text-lg sm:text-2xl font-black text-emerald-700 mt-1 sm:mt-1.5 leading-tight truncate">
                  L. {Number(resumen.total_recaudado).toFixed(0)}
                </p>
                <p className="text-[10px] font-bold text-emerald-600 mt-0.5 leading-none truncate">
                  {resumen.porcentaje_recaudado}% del total
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            </motion.div>

            {/* KPI 3: Pendiente por Cobrar */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={SPRING_FAST}
              className="glass-panel rounded-2xl p-3 sm:p-4 flex items-center justify-between h-[84px] sm:h-[90px] cursor-default"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest leading-none">Por Cobrar</p>
                <p className="text-lg sm:text-2xl font-black text-amber-700 mt-1 sm:mt-1.5 leading-tight truncate">
                  L. {Number(resumen.total_pendiente).toFixed(0)}
                </p>
                <p className="text-[10px] font-bold text-amber-600 mt-0.5 leading-none truncate">
                  Pendiente
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
            </motion.div>

            {/* KPI 4: Entregas Realizadas */}
            <motion.div
              whileHover={{ y: -2 }}
              transition={SPRING_FAST}
              className="glass-panel rounded-2xl p-3 sm:p-4 flex items-center justify-between h-[84px] sm:h-[90px] cursor-default"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-sky-600 uppercase tracking-widest leading-none">Entregados</p>
                <p className="text-lg sm:text-2xl font-black text-slate-900 mt-1 sm:mt-1.5 leading-tight truncate">
                  {resumen.boletos_entregados} <span className="text-xs font-bold text-slate-400">/ {resumen.total_boletos}</span>
                </p>
                <p className="text-[10px] font-bold text-sky-600 mt-0.5 leading-none truncate">
                  {resumen.porcentaje_entregado}% entregados
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </div>
            </motion.div>

          </div>

          {/* ========== 2. BARRA DE REGISTRO RÁPIDO (QUICK-ADD) ========== */}
          {canWrite && (
            <div className="glass-panel rounded-[2rem] p-4 sm:p-5 border border-white/80 shadow-xs relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                    Asignación Rápida de Boletos
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 hidden sm:inline">
                    &bull; Presiona Enter para guardar y registrar el siguiente
                  </span>
                </div>

                {/* Toast feedback temporal de guardado */}
                <AnimatePresence>
                  {quickSavedToast && (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200"
                    >
                      {quickSavedToast}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <form onSubmit={handleQuickAddSubmit} className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 sm:gap-3">
                {/* Campo 1: Nombre de la Persona (100% manual) */}
                <div className="relative flex-1">
                  <input
                    ref={nameInputRef}
                    type="text"
                    required
                    placeholder="Nombre del comprador (ej. Edis, Enrique...)"
                    value={quickForm.nombre_persona}
                    onChange={(e) => setQuickForm({ ...quickForm, nombre_persona: e.target.value })}
                    className="glass-input w-full h-11 rounded-2xl px-4 text-sm sm:text-xs font-bold text-slate-900 focus:outline-none pl-10"
                  />
                  <div className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </div>

                {/* Fila responsiva para Boletos y Números */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  {/* Campo 2: Stepper táctil [-] [cant] [+] sin superposiciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-white/90 rounded-2xl border border-white/90 shadow-2xs h-11 px-1">
                      <button
                        type="button"
                        onClick={() => setQuickForm(prev => ({ ...prev, cantidad_boletos: Math.max(1, prev.cantidad_boletos - 1) }))}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-base font-bold transition-colors cursor-pointer select-none active:scale-95"
                        title="Restar 1 boleto"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        required
                        value={quickForm.cantidad_boletos}
                        onChange={(e) => setQuickForm({ ...quickForm, cantidad_boletos: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 h-8 text-center text-xs font-black text-slate-900 bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuickForm(prev => ({ ...prev, cantidad_boletos: prev.cantidad_boletos + 1 }))}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-base font-bold transition-colors cursor-pointer select-none active:scale-95"
                        title="Sumar 1 boleto"
                      >
                        +
                      </button>
                    </div>

                    {/* Botones de incremento rápido +5 y +10 */}
                    <div className="inline-flex items-center gap-1 bg-white/70 p-1 rounded-2xl border border-white/80 shadow-2xs h-11">
                      {[5, 10].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setQuickForm(prev => ({ ...prev, cantidad_boletos: prev.cantidad_boletos + n }))}
                          className="px-2.5 py-1.5 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer active:scale-95"
                          title={`Sumar ${n} boletos`}
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Campo 3: Rango o Números (Opcional) */}
                  <div className="flex-1 sm:w-32 shrink-0 min-w-[110px]">
                    <input
                      type="text"
                      placeholder="Núms. (opcional)"
                      value={quickForm.numeros_boletos}
                      onChange={(e) => setQuickForm({ ...quickForm, numeros_boletos: e.target.value })}
                      className="glass-input w-full h-11 rounded-2xl px-3 text-sm sm:text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Fila responsiva para Total + Estados + Guardar */}
                <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
                  {/* Total Calculado en Vivo */}
                  <div className="flex items-center justify-center px-3.5 h-11 rounded-2xl bg-slate-900/5 border border-white/80 text-xs font-extrabold text-slate-800 shrink-0">
                    L. {Number(quickForm.cantidad_boletos * (activeEvento?.precio_boleto || 0)).toFixed(0)}
                  </div>

                  {/* Switches Rápidos: Pagado & Entregado */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuickForm(prev => ({ ...prev, pagado: !prev.pagado }))}
                      className={`h-11 px-3 rounded-2xl text-[11px] font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-95 ${
                        quickForm.pagado
                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                          : 'bg-white/80 text-slate-400 border-white/90 hover:text-slate-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>Pagado</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuickForm(prev => ({ ...prev, entregado: !prev.entregado }))}
                      className={`h-11 px-3 rounded-2xl text-[11px] font-extrabold border transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-95 ${
                        quickForm.entregado
                          ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                          : 'bg-white/80 text-slate-400 border-white/90 hover:text-slate-700'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      <span>Entregado</span>
                    </button>
                  </div>

                  {/* Botón Guardar */}
                  <motion.button
                    type="submit"
                    disabled={quickAddMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 sm:flex-none h-11 px-5 rounded-2xl bg-slate-900 text-white text-xs font-black shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Guardar</span>
                  </motion.button>
                </div>
              </form>
            </div>
          )}

          {/* ========== 3. TABLA DE CONTROL DE PARTICIPANTES ========== */}
          <div className="glass-panel rounded-[2rem] overflow-hidden">
            
            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4.5 border-b border-white/60 gap-3">
              {/* Buscador */}
              <div className="relative flex-1 max-w-none sm:max-w-sm">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o número de boleto..."
                  className="glass-input w-full h-10 rounded-2xl pl-10 pr-4 text-xs font-semibold focus:outline-none"
                />
                <div className="absolute left-3.5 top-3 text-slate-400 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </div>
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">
                    ✕
                  </button>
                )}
              </div>

              {/* Filtros Rápidos */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
                <button
                  onClick={() => setFilterStatus('todos')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === 'todos' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  Todos ({participantes.length})
                </button>
                <button
                  onClick={() => setFilterStatus('pendientes_pago')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === 'pendientes_pago' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  Sin Pagar
                </button>
                <button
                  onClick={() => setFilterStatus('pagados')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === 'pagados' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  Pagados
                </button>
                <button
                  onClick={() => setFilterStatus('pendientes_entrega')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === 'pendientes_entrega' ? 'bg-slate-700 text-white shadow-2xs' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  Por Entregar
                </button>
                <button
                  onClick={() => setFilterStatus('entregados')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterStatus === 'entregados' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-white/70 text-slate-600 hover:bg-white'
                  }`}
                >
                  Entregados
                </button>
              </div>
            </div>

            {/* VISTA MÓVIL (< 640px): Tarjetas táctiles fluidas y modernas */}
            <div className="block sm:hidden p-3 space-y-2.5">
              {isLoadingParticipantes ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-400">
                  Cargando boletos asignados...
                </div>
              ) : filteredParticipantes.length === 0 ? (
                <div className="py-12 text-center p-4">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-white/80 border border-white flex items-center justify-center mb-2.5 text-slate-400 shadow-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <p className="text-sm font-bold text-slate-800">No se encontraron registros</p>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">
                    {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Usa el formulario superior para registrar.'}
                  </p>
                </div>
              ) : (
                filteredParticipantes.map((p, idx) => (
                  <div key={p.id} className="p-3.5 space-y-2.5 bg-white/60 rounded-2xl shadow-2xs border border-white/80">
                    {/* Fila Superior: No., Nombre, Total y Acciones */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-extrabold text-slate-400 w-4 shrink-0">{idx + 1}</span>
                        <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black uppercase text-[11px] shrink-0">
                          {p.nombre_persona.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate leading-tight">{p.nombre_persona}</p>
                          {p.telefono && <p className="text-[10px] font-medium text-slate-400 truncate">{p.telefono}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-black text-xs text-slate-900 bg-white/90 px-2.5 py-1 rounded-xl border border-white/90 shadow-2xs">
                          L. {Number(p.monto_total || 0).toFixed(0)}
                        </span>
                        {canWrite && (
                          <div className="flex items-center">
                            <button
                              onClick={() => setEditingParticipante(p)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white cursor-pointer"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                            </button>
                            <button
                              onClick={() => confirmAction('Eliminar Registro', `¿Eliminar boletos de "${p.nombre_persona}"?`, () => deleteParticipanteMutation.mutate(p.id))}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 cursor-pointer"
                              title="Eliminar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14H6L5 6"></path></svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fila Central: Detalle de boletos y números */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-extrabold text-[11px]">
                          {p.cantidad_boletos} {p.cantidad_boletos === 1 ? 'boleto' : 'boletos'}
                        </span>
                        {p.numeros_boletos && (
                          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                            #{p.numeros_boletos}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fila Inferior: Botones táctiles grandes para alternar Pago y Entrega al instante (0ms) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => canWrite && togglePagoMutation.mutate(p.id)}
                        disabled={!canWrite}
                        className={`h-9.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 select-none ${
                          p.pagado
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${p.pagado ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {p.pagado ? '✓ Pagado' : '○ Sin Pagar'}
                      </button>

                      <button
                        type="button"
                        onClick={() => canWrite && toggleEntregaMutation.mutate(p.id)}
                        disabled={!canWrite}
                        className={`h-9.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 select-none ${
                          p.entregado
                            ? 'bg-sky-50 text-sky-700 border-sky-200 shadow-2xs'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${p.entregado ? 'bg-sky-500' : 'bg-slate-400'}`} />
                        {p.entregado ? '✓ Entregado' : '○ Pendiente'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* VISTA DESKTOP / TABLET (>= 640px): Tabla completa */}
            <div className="hidden sm:block relative w-full overflow-x-auto custom-scrollbar p-2 sm:p-4">
              <table className="w-full text-left text-sm min-w-[660px]">
                <thead>
                  <tr className="border-b border-white/60">
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">#</th>
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Participante</th>
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Boletos</th>
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Números</th>
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Total</th>
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Estado Pago</th>
                    <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-center">Entrega Boletos</th>
                    {canWrite && <th className="h-11 px-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/40">
                  {isLoadingParticipantes ? (
                    <tr>
                      <td colSpan={canWrite ? 8 : 7} className="py-16 text-center text-xs font-semibold text-slate-400">
                        Cargando lista de participantes...
                      </td>
                    </tr>
                  ) : filteredParticipantes.length === 0 ? (
                    <tr>
                      <td colSpan={canWrite ? 8 : 7} className="py-16 text-center">
                        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/80 border border-white flex items-center justify-center mb-2.5 text-slate-400 shadow-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </div>
                        <p className="text-sm font-bold text-slate-800">No se encontraron boletos asignados</p>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                          {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Usa la barra superior para agregar el primer participante.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredParticipantes.map((p, idx) => (
                      <tr
                        key={p.id}
                        className="group transition-colors duration-150 hover:bg-white/70 rounded-2xl"
                      >
                        {/* Índice */}
                        <td className="px-4 py-3 align-middle text-xs font-bold text-slate-400 rounded-l-2xl">
                          {idx + 1}
                        </td>

                        {/* Nombre del Participante */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black uppercase text-[11px] shrink-0 shadow-2xs">
                              {p.nombre_persona.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 text-xs block truncate leading-tight">
                                {p.nombre_persona}
                              </span>
                              {p.telefono && (
                                <span className="text-[10px] font-medium text-slate-400 block truncate mt-0.5">
                                  {p.telefono}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cantidad de Boletos */}
                        <td className="px-4 py-3 align-middle text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-black text-xs border border-white/60">
                            {p.cantidad_boletos}
                          </span>
                        </td>

                        {/* Números Asignados */}
                        <td className="px-4 py-3 align-middle">
                          {p.numeros_boletos ? (
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100">
                              {p.numeros_boletos}
                            </span>
                          ) : (
                            <span className="text-slate-300 italic text-xs">-</span>
                          )}
                        </td>

                        {/* Monto Total */}
                        <td className="px-4 py-3 align-middle text-right">
                          <span className="font-black text-xs text-slate-900">
                            L. {Number(p.monto_total || 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Toggle de Pago Interactivo en 1 Clic */}
                        <td className="px-4 py-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => canWrite && togglePagoMutation.mutate(p.id)}
                            disabled={!canWrite}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer select-none active:scale-95 ${
                              p.pagado
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            title={canWrite ? 'Haz clic para alternar estado de pago' : ''}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.pagado ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {p.pagado ? 'Pagado' : 'Pendiente'}
                          </button>
                        </td>

                        {/* Toggle de Entrega Interactivo en 1 Clic */}
                        <td className="px-4 py-3 align-middle text-center">
                          <button
                            type="button"
                            onClick={() => canWrite && toggleEntregaMutation.mutate(p.id)}
                            disabled={!canWrite}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer select-none active:scale-95 ${
                              p.entregado
                                ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 shadow-2xs'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={canWrite ? 'Haz clic para alternar entrega de boletos' : ''}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${p.entregado ? 'bg-sky-500' : 'bg-slate-400'}`} />
                            {p.entregado ? 'Entregado' : 'Pendiente'}
                          </button>
                        </td>

                        {/* Acciones */}
                        {canWrite && (
                          <td className="px-4 py-3 align-middle text-right rounded-r-2xl">
                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => setEditingParticipante(p)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                                title="Editar datos"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                              </button>
                              <button
                                onClick={() => confirmAction('Eliminar Registro', `¿Eliminar la asignación de ${p.cantidad_boletos} boletos para "${p.nombre_persona}"?`, () => deleteParticipanteMutation.mutate(p.id))}
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

        </div>
      )}

      {/* ========== MODAL DE CREACIÓN / EDICIÓN DE EVENTO ========== */}
      <AnimatePresence>
        {isEventModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
            onClick={() => setIsEventModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={SPRING_FAST}
              className="glass-panel-elevated rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl my-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/70 bg-white/40">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingEvento ? 'Editar Actividad' : 'Nueva Actividad / Rifa'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Configura el nombre y precio unitario del boleto.
                  </p>
                </div>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Formulario */}
              <form onSubmit={handleEventFormSubmit} className="p-6 space-y-4">
                {eventFormError && (
                  <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                    {eventFormError}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nombre de la Actividad <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Gran Rifa Navideña Pro-Templo"
                    value={eventForm.nombre}
                    onChange={(e) => setEventForm({ ...eventForm, nombre: e.target.value })}
                    className="glass-input w-full h-10 rounded-xl px-3.5 text-xs font-bold text-slate-900 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tipo de Actividad
                    </label>
                    <select
                      value={eventForm.tipo}
                      onChange={(e) => setEventForm({ ...eventForm, tipo: e.target.value })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      <option value="rifa">Rifa</option>
                      <option value="subasta">Subasta</option>
                      <option value="colecta">Colecta Especial</option>
                      <option value="otro">Otro Evento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Precio Boleto (L.) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="Ej. 50.00"
                      value={eventForm.precio_boleto}
                      onChange={(e) => setEventForm({ ...eventForm, precio_boleto: parseFloat(e.target.value) || 0 })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Meta (L.) <span className="font-normal normal-case text-slate-400">(Opcional)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ej. 10000"
                      value={eventForm.meta_recaudacion}
                      onChange={(e) => setEventForm({ ...eventForm, meta_recaudacion: e.target.value })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha del Evento
                    </label>
                    <input
                      type="date"
                      value={eventForm.fecha_evento}
                      onChange={(e) => setEventForm({ ...eventForm, fecha_evento: e.target.value })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Descripción / Premio <span className="font-normal normal-case text-slate-400">(Opcional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalles de premios, bases del sorteo..."
                    value={eventForm.descripcion}
                    onChange={(e) => setEventForm({ ...eventForm, descripcion: e.target.value })}
                    className="glass-input w-full rounded-xl p-3 text-xs font-medium text-slate-900 focus:outline-none resize-none"
                  />
                </div>

                {/* Acciones */}
                <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="glass-button-secondary flex-1 rounded-xl text-slate-700 text-xs font-bold py-2.5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createEventoMutation.isPending || updateEventoMutation.isPending}
                    className="flex-1 rounded-xl bg-slate-900 text-white text-xs font-bold py-2.5 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {createEventoMutation.isPending || updateEventoMutation.isPending ? 'Guardando...' : editingEvento ? 'Guardar Cambios' : 'Crear Actividad'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== MODAL DE EDICIÓN DE PARTICIPANTE ========== */}
      <AnimatePresence>
        {editingParticipante && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 backdrop-blur-md p-3 sm:p-4 overflow-y-auto"
            onClick={() => setEditingParticipante(null)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 16 }}
              transition={SPRING_FAST}
              className="glass-panel-elevated rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl my-auto flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/70 bg-white/40">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Modificar Boletos Asignados
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    {editingParticipante.nombre_persona}
                  </p>
                </div>
                <button
                  onClick={() => setEditingParticipante(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateParticipanteMutation.mutate({
                    id: editingParticipante.id,
                    data: {
                      nombre_persona: editingParticipante.nombre_persona,
                      telefono: editingParticipante.telefono,
                      cantidad_boletos: editingParticipante.cantidad_boletos,
                      numeros_boletos: editingParticipante.numeros_boletos,
                      monto_total: editingParticipante.monto_total,
                      pagado: editingParticipante.pagado,
                      entregado: editingParticipante.entregado,
                      notas: editingParticipante.notas
                    }
                  });
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                    Nombre del Participante
                  </label>
                  <input
                    type="text"
                    required
                    value={editingParticipante.nombre_persona}
                    onChange={(e) => setEditingParticipante({ ...editingParticipante, nombre_persona: e.target.value })}
                    className="glass-input w-full h-10 rounded-xl px-3.5 text-xs font-bold text-slate-900 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Cant. Boletos
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={editingParticipante.cantidad_boletos}
                      onChange={(e) => {
                        const cant = Math.max(1, parseInt(e.target.value) || 1);
                        const precio = activeEvento?.precio_boleto || 0;
                        setEditingParticipante({
                          ...editingParticipante,
                          cantidad_boletos: cant,
                          monto_total: cant * precio
                        });
                      }}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Monto Total (L.)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editingParticipante.monto_total}
                      onChange={(e) => setEditingParticipante({ ...editingParticipante, monto_total: parseFloat(e.target.value) || 0 })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Números Asignados
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. 01 - 05"
                      value={editingParticipante.numeros_boletos || ''}
                      onChange={(e) => setEditingParticipante({ ...editingParticipante, numeros_boletos: e.target.value })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="text"
                      placeholder="+504 9999-9999"
                      value={editingParticipante.telefono || ''}
                      onChange={(e) => setEditingParticipante({ ...editingParticipante, telefono: e.target.value })}
                      className="glass-input w-full h-10 rounded-xl px-3 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Toggles de Estado */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <div
                    onClick={() => setEditingParticipante({ ...editingParticipante, pagado: !editingParticipante.pagado })}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      editingParticipante.pagado ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">Pagado</span>
                    <span className={`w-2 h-2 rounded-full ${editingParticipante.pagado ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  </div>

                  <div
                    onClick={() => setEditingParticipante({ ...editingParticipante, entregado: !editingParticipante.entregado })}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      editingParticipante.entregado ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-bold">Entregado</span>
                    <span className={`w-2 h-2 rounded-full ${editingParticipante.entregado ? 'bg-sky-500' : 'bg-slate-300'}`} />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditingParticipante(null)}
                    className="glass-button-secondary flex-1 rounded-xl text-slate-700 text-xs font-bold py-2.5 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updateParticipanteMutation.isPending}
                    className="flex-1 rounded-xl bg-slate-900 text-white text-xs font-bold py-2.5 hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
                  >
                    {updateParticipanteMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
