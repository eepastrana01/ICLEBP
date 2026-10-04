import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Wrench,
  Ticket,
  PartyPopper,
  Users,
  Church,
  Tag,
  Calendar,
  Clock,
  MapPin,
  Target,
  Layers,
  UserCheck,
  X,
  Check
} from 'lucide-react';
import api from '../lib/api';
import { SPRING_FAST } from '../lib/animations';

export interface Actividad {
  id: number;
  fecha: string;
  actividad: string;
  detalles: string;
  categoria?: string;
  completado: boolean;
}

export interface AdminCategory {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  activeRing: string;
  presets: string[];
}

export const ADMIN_CATEGORIES: AdminCategory[] = [
  {
    id: 'mantenimiento',
    label: 'Aseo y Mantenimiento',
    shortLabel: 'Aseo / Limpieza',
    icon: Wrench,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    activeRing: 'ring-2 ring-emerald-400/40 border-emerald-300 bg-emerald-50/70 text-emerald-900',
    presets: [
      'Jornada de Aseo General',
      'Aseo de Templo (Comité de Damas)',
      'Aseo de Templo (Caballeros)',
      'Mantenimiento y Reparaciones',
      'Pintura y Embellecimiento'
    ]
  },
  {
    id: 'recaudacion',
    label: 'Rifas y Pro-Fondos',
    shortLabel: 'Rifas / Sorteos',
    icon: Ticket,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    dotColor: 'bg-amber-500',
    activeRing: 'ring-2 ring-amber-400/40 border-amber-300 bg-amber-50/70 text-amber-900',
    presets: [
      'Rifa Pro-Fondos Congregacional',
      'Venta de Comida / Kermesse',
      'Sorteo de Canasta Benéfica',
      'Desayuno de Recaudación',
      'Ofrenda Especial de Construcción'
    ]
  },
  {
    id: 'celebracion',
    label: 'Celebración y Convivio',
    shortLabel: 'Celebraciones',
    icon: PartyPopper,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    dotColor: 'bg-purple-500',
    activeRing: 'ring-2 ring-purple-400/40 border-purple-300 bg-purple-50/70 text-purple-900',
    presets: [
      'Celebración Día de la Madre',
      'Celebración Día del Padre',
      'Celebración Día del Niño',
      'Convivio Familiar Congregacional',
      'Aniversario de la Iglesia',
      'Almuerzo de Confraternidad'
    ]
  },
  {
    id: 'reunion',
    label: 'Reunión y Asamblea',
    shortLabel: 'Reunión / Junta',
    icon: Users,
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    dotColor: 'bg-sky-500',
    activeRing: 'ring-2 ring-sky-400/40 border-sky-300 bg-sky-50/70 text-sky-900',
    presets: [
      'Reunión de Junta Directiva',
      'Reunión de Comité de Damas',
      'Reunión de Caballeros',
      'Asamblea General Ordinaria',
      'Planificación de Actividades'
    ]
  },
  {
    id: 'culto',
    label: 'Culto y Liturgia',
    shortLabel: 'Culto Especial',
    icon: Church,
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-500',
    activeRing: 'ring-2 ring-indigo-400/40 border-indigo-300 bg-indigo-50/70 text-indigo-900',
    presets: [
      'Culto Dominical Especial',
      'Vigilia de Oración y Alabanza',
      'Santa Cena Solemne',
      'Escuela Bíblica de Vacaciones'
    ]
  },
  {
    id: 'otro',
    label: 'Otro / Especial',
    shortLabel: 'Otro',
    icon: Tag,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-200',
    dotColor: 'bg-slate-500',
    activeRing: 'ring-2 ring-slate-400/40 border-slate-300 bg-slate-100 text-slate-900',
    presets: [
      'Actividad Especial de la Iglesia',
      'Visita Pastoral Congregacional',
      'Capacitación de Liderazgo'
    ]
  }
];

export function detectCategoryFromTitle(title: string, explicitCategory?: string): string {
  if (explicitCategory && ADMIN_CATEGORIES.some(c => c.id === explicitCategory)) {
    return explicitCategory;
  }
  const t = (title || '').toLowerCase();
  if (t.includes('aseo') || t.includes('limpieza') || t.includes('mantenimiento') || t.includes('pintura')) return 'mantenimiento';
  if (t.includes('rifa') || t.includes('sorteo') || t.includes('kermesse') || t.includes('venta') || t.includes('fondos') || t.includes('colecta') || t.includes('desayuno')) return 'recaudacion';
  if (t.includes('celebraci') || t.includes('convivio') || t.includes('madre') || t.includes('padre') || t.includes('niño') || t.includes('aniversario') || t.includes('almuerzo')) return 'celebracion';
  if (t.includes('junta') || t.includes('reunión') || t.includes('reunion') || t.includes('asamblea') || t.includes('directiva') || t.includes('comité') || t.includes('comite')) return 'reunion';
  if (t.includes('culto') || t.includes('dominical') || t.includes('vigilia') || t.includes('oración') || t.includes('ayuno') || t.includes('santa cena') || t.includes('escuela')) return 'culto';
  return 'otro';
}

export function getCategoryTag(title: string, categoria?: string) {
  const catId = (categoria && ADMIN_CATEGORIES.some(c => c.id === categoria))
    ? categoria
    : detectCategoryFromTitle(title);
  const cat = ADMIN_CATEGORIES.find(c => c.id === catId) || ADMIN_CATEGORIES[ADMIN_CATEGORIES.length - 1];
  return {
    id: cat.id,
    label: cat.shortLabel,
    bg: cat.badgeBg,
    text: cat.badgeText,
    border: cat.badgeBorder,
    dot: cat.dotColor
  };
}

function formatFullDateNatural(dateStr: string) {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const dateObj = new Date(y, m, d);
  const weekday = dateObj.toLocaleDateString('es-HN', { weekday: 'long' });
  const monthName = dateObj.toLocaleDateString('es-HN', { month: 'long' });
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  return {
    label: `${cap(weekday)}, ${d} de ${cap(monthName)} de ${y}`,
    weekday: cap(weekday),
    isWeekend
  };
}

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: Actividad | null;
  initialDate?: string;
  onSuccess?: () => void;
}

const DETAIL_CHIPS = [
  { label: 'Responsable:', icon: UserCheck, snippet: 'Responsable: ' },
  { label: 'Lugar:', icon: MapPin, snippet: 'Lugar: ' },
  { label: 'Horario:', icon: Clock, snippet: 'Horario: ' },
  { label: 'Meta:', icon: Target, snippet: 'Meta: ' },
  { label: 'Materiales:', icon: Layers, snippet: 'Materiales: ' }
];

export function ActivityModal({
  isOpen,
  onClose,
  editingItem,
  initialDate,
  onSuccess
}: ActivityModalProps) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState({
    fecha: initialDate || new Date().toISOString().split('T')[0],
    actividad: '',
    detalles: ''
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('mantenimiento');
  const [formError, setFormError] = useState('');

  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  // Sync state on open / edit
  useEffect(() => {
    if (!isOpen) return;
    if (editingItem) {
      const d = new Date(editingItem.fecha);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      const yyyy = local.getFullYear();
      const mm = String(local.getMonth() + 1).padStart(2, '0');
      const dd = String(local.getDate()).padStart(2, '0');
      setForm({
        fecha: `${yyyy}-${mm}-${dd}`,
        actividad: editingItem.actividad,
        detalles: editingItem.detalles || ''
      });
      setSelectedCategory(editingItem.categoria || detectCategoryFromTitle(editingItem.actividad));
    } else {
      setForm({
        fecha: initialDate || new Date().toISOString().split('T')[0],
        actividad: '',
        detalles: ''
      });
      setSelectedCategory('mantenimiento');
    }
    setFormError('');
  }, [editingItem, initialDate, isOpen]);

  const crearMutation = useMutation({
    mutationFn: (data: { fecha: string; actividad: string; detalles: string; categoria?: string }) => api.post('/actividades', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'No se pudo registrar la actividad.');
    }
  });

  const editarMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { fecha: string; actividad: string; detalles: string; categoria?: string } }) => api.put(`/actividades/editar/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actividades'] });
      onClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'No se pudo actualizar la actividad.');
    }
  });

  const isSaving = crearMutation.isPending || editarMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.fecha || !form.actividad.trim()) {
      setFormError('La fecha y el nombre de la actividad son obligatorios.');
      return;
    }
    const payload = {
      fecha: form.fecha,
      actividad: form.actividad.trim(),
      detalles: form.detalles.trim(),
      categoria: selectedCategory
    };
    if (editingItem) {
      editarMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      crearMutation.mutate(payload);
    }
  };

  const handleSelectPreset = (preset: string) => {
    setForm(prev => ({ ...prev, actividad: preset }));
  };

  const handleInsertDetailChip = (snippet: string) => {
    setForm(prev => {
      const current = prev.detalles.trim();
      if (!current) return { ...prev, detalles: snippet };
      if (current.includes(snippet.trim())) return prev;
      return { ...prev, detalles: `${current}\n${snippet}` };
    });
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const activeCategoryData = ADMIN_CATEGORIES.find(c => c.id === selectedCategory) || ADMIN_CATEGORIES[0];
  const naturalDate = formatFullDateNatural(form.fecha);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 14 }}
            transition={SPRING_FAST}
            className="relative w-full max-w-xl bg-white rounded-3xl sm:rounded-[2rem] border border-slate-100 shadow-[0_20px_50px_rgba(15,23,42,0.18)] overflow-hidden z-10 my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-white">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-2xs">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                    {editingItem ? 'Editar Actividad' : 'Nueva Actividad Congregacional'}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {editingItem ? 'Actualiza la fecha, nombre o detalles organizativos' : 'Planificación de aseos, rifas, convivios y asambleas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                title="Cerrar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">

              {/* Error banner */}
              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-bold flex items-center gap-2"
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </motion.div>
              )}

              {/* 1. SECCIÓN FECHA CON FORMATO NATURAL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Fecha de la Actividad <span className="text-rose-500">*</span>
                  </label>
                  {naturalDate?.isWeekend && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
                      Fin de semana
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={form.fecha}
                      onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                      className="w-full rounded-2xl px-4 py-2.5 pl-10 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all cursor-pointer"
                    />
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>

                  {naturalDate && (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50/80 border border-slate-100 text-slate-700 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>{naturalDate.label}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. SELECTOR DE CATEGORÍA ADMINISTRATIVA CON ICONOS */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                  Tipo de Actividad
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ADMIN_CATEGORIES.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    const IconComp = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs font-bold transition-all text-left cursor-pointer ${
                          isSelected
                            ? cat.activeRing
                            : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-white/80 shadow-2xs' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <IconComp className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Presets de la categoría seleccionada */}
                <div className="mt-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Sugerencias de {activeCategoryData.label}:
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Toca para autocompletar</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeCategoryData.presets.map(preset => {
                      const isSelected = form.actividad === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSelectPreset(preset)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                          }`}
                        >
                          <span>{preset}</span>
                          {isSelected && (
                            <Check className="w-3 h-3" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. NOMBRE DE LA ACTIVIDAD */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nombre de la Actividad <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Ej. Aseo General del Templo, Rifa Pro-Techo..."
                    value={form.actividad}
                    onChange={e => setForm(prev => ({ ...prev, actividad: e.target.value }))}
                    className="w-full rounded-2xl px-4 py-2.5 pl-10 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all placeholder:text-slate-400"
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* 4. DETALLES Y ORGANIZACIÓN (CON ASISTENTE DE PLANTILLAS E ICONOS LUCIDE) */}
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Detalles y Organización <span className="font-normal normal-case text-slate-400">(opcional)</span>
                </label>
                <textarea
                  ref={textareaRef}
                  rows={3}
                  placeholder="Responsable, lugar, horario o notas importantes..."
                  value={form.detalles}
                  onChange={e => setForm(prev => ({ ...prev, detalles: e.target.value }))}
                  className="w-full rounded-2xl p-3.5 text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400 transition-all resize-none placeholder:text-slate-400 leading-relaxed"
                />

                {/* Chips de inserción rápida con iconos Lucide */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mr-0.5">
                    Insertar:
                  </span>
                  {DETAIL_CHIPS.map(chip => {
                    const ChipIcon = chip.icon;
                    return (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleInsertDetailChip(chip.snippet)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 border border-slate-200/70 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                      >
                        <ChipIcon className="w-3 h-3 text-slate-500" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer Acciones */}
              <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-slate-600 hover:text-slate-900 bg-slate-100/70 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingItem ? 'Guardar Cambios' : 'Crear Actividad'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
