import { useState, useMemo, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';
import { generarPDFBautismo, type BautismoPDFData } from '../lib/pdfBautismo';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import {
  Search,
  Plus,
  Download,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  FileText,
  ScrollText
} from 'lucide-react';

interface Bautismo {
  id: number;
  numero_registro: string;
  nombre_persona: string;
  genero: string;
  fecha_nacimiento: string;
  lugar_nacimiento: string;
  padre?: string | null;
  madre?: string | null;
  padrinos?: string | null;
  fecha_bautismo: string;
  pastor_oficiante: string;
  lugar_bautismo?: string | null;
  es_reposicion: boolean;
  nota_reposicion?: string | null;
  miembro_id?: number | null;
  created_at: string;
}

interface MiembroSimple {
  id: number;
  nombre: string;
  fecha_nacimiento: string;
  bautizado: boolean;
}

export default function BaptismsView() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';
  const canWrite = isAdmin || user.permisos?.bautismos === 'escritura' || user.permisos?.bautismos === 'admin';
  const { confirmState, confirmAction, closeConfirm } = useConfirm();

  const [activeView, setActiveView] = useState<'list' | 'form'>('list');
  const [editingItem, setEditingItem] = useState<Bautismo | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'original' | 'reposicion'>('todos');

  // Form State
  const [form, setForm] = useState({
    numero_registro: '',
    nombre_persona: '',
    genero: 'M',
    fecha_nacimiento: '',
    lugar_nacimiento: 'San Pedro Sula, Cortés, Honduras',
    padre: '',
    madre: '',
    padrinos: '',
    fecha_bautismo: new Date().toISOString().split('T')[0],
    pastor_oficiante: 'Pr. Mario Antonio Ortega',
    lugar_bautismo: 'Iglesia Cristiana Luterana El Buen Pastor, SPS',
    es_reposicion: false,
    nota_reposicion: '',
    miembro_id: null as number | null
  });
  const [formError, setFormError] = useState('');

  // Queries
  const { data: bautismos, isLoading } = useQuery<Bautismo[]>({
    queryKey: ['bautismos'],
    queryFn: async () => (await api.get('/bautismos')).data,
  });

  const { data: miembros } = useQuery<MiembroSimple[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data,
  });

  // KPIs
  const total = bautismos?.length || 0;
  const currentYear = new Date().getFullYear();
  const esteAnio = bautismos?.filter(b => {
    const y = new Date(b.fecha_bautismo).getFullYear();
    return y === currentYear;
  }).length || 0;
  const reposiciones = bautismos?.filter(b => b.es_reposicion).length || 0;

  // Filtrado
  const filteredBautismos = useMemo(() => {
    if (!bautismos) return [];
    return bautismos.filter(b => {
      const matchSearch =
        b.nombre_persona.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.numero_registro.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.pastor_oficiante.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;
      if (filterType === 'original') return !b.es_reposicion;
      if (filterType === 'reposicion') return b.es_reposicion;
      return true;
    });
  }, [bautismos, searchTerm, filterType]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/bautismos', data),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bautismos'] });
      queryClient.invalidateQueries({ queryKey: ['miembros'] });
      setActiveView('list');
      // Preguntar o descargar directamente
      generarPDFBautismo({
        ...res.data,
        genero: variables.genero
      });
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'Error al guardar el acta de bautismo.');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof form }) => api.put(`/bautismos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bautismos'] });
      setActiveView('list');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error || 'Error al actualizar el registro.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/bautismos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bautismos'] });
    }
  });

  const openCreate = async () => {
    setEditingItem(null);
    let nextReg = '1';
    try {
      const res = await api.get('/bautismos/next-registro');
      if (res.data?.next_registro) nextReg = res.data.next_registro;
    } catch (e) {
      console.warn('Error al sugerir correlativo:', e);
    }

    setForm({
      numero_registro: nextReg,
      nombre_persona: '',
      genero: 'M',
      fecha_nacimiento: '',
      lugar_nacimiento: 'San Pedro Sula, Cortés, Honduras',
      padre: '',
      madre: '',
      padrinos: '',
      fecha_bautismo: new Date().toISOString().split('T')[0],
      pastor_oficiante: 'Pr. Mario Antonio Ortega',
      lugar_bautismo: 'Iglesia Cristiana Luterana El Buen Pastor, SPS',
      es_reposicion: false,
      nota_reposicion: '',
      miembro_id: null
    });
    setFormError('');
    setActiveView('form');
  };

  const openEdit = (b: Bautismo) => {
    setEditingItem(b);
    const parseDate = (dStr: string) => {
      if (!dStr) return '';
      const d = new Date(dStr);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
      return local.toISOString().split('T')[0];
    };

    setForm({
      numero_registro: b.numero_registro,
      nombre_persona: b.nombre_persona,
      genero: b.genero || 'M',
      fecha_nacimiento: parseDate(b.fecha_nacimiento),
      lugar_nacimiento: b.lugar_nacimiento || 'San Pedro Sula, Cortés, Honduras',
      padre: b.padre || '',
      madre: b.madre || '',
      padrinos: b.padrinos || '',
      fecha_bautismo: parseDate(b.fecha_bautismo),
      pastor_oficiante: b.pastor_oficiante,
      lugar_bautismo: b.lugar_bautismo || 'Iglesia Cristiana Luterana El Buen Pastor, SPS',
      es_reposicion: b.es_reposicion,
      nota_reposicion: b.nota_reposicion || '',
      miembro_id: b.miembro_id || null
    });
    setFormError('');
    setActiveView('form');
  };

  const handleSelectMiembro = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setForm(prev => ({ ...prev, miembro_id: null }));
      return;
    }
    const mId = parseInt(val, 10);
    const m = miembros?.find(item => item.id === mId);
    if (m) {
      let bDate = '';
      if (m.fecha_nacimiento) {
        const d = new Date(m.fecha_nacimiento);
        const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
        bDate = local.toISOString().split('T')[0];
      }
      setForm(prev => ({
        ...prev,
        miembro_id: m.id,
        nombre_persona: m.nombre,
        fecha_nacimiento: bDate || prev.fecha_nacimiento
      }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.numero_registro.trim()) {
      setFormError('El número de registro es requerido.');
      return;
    }
    if (!form.nombre_persona.trim()) {
      setFormError('El nombre de la persona es requerido.');
      return;
    }
    if (!form.fecha_nacimiento) {
      setFormError('La fecha de nacimiento es requerida.');
      return;
    }
    if (!form.fecha_bautismo) {
      setFormError('La fecha del bautismo es requerida.');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleDelete = (b: Bautismo) => {
    confirmAction(
      'Eliminar Acta de Bautismo',
      `¿Estás seguro de que deseas eliminar el acta N° ${b.numero_registro} de ${b.nombre_persona}? Esta acción no se puede deshacer.`,
      () => deleteMutation.mutate(b.id)
    );
  };

  const handleDownloadPDF = (b: Bautismo) => {
    const pdfData: BautismoPDFData = {
      numero_registro: b.numero_registro,
      nombre_persona: b.nombre_persona,
      genero: b.genero,
      fecha_nacimiento: b.fecha_nacimiento,
      lugar_nacimiento: b.lugar_nacimiento,
      padre: b.padre,
      madre: b.madre,
      padrinos: b.padrinos,
      fecha_bautismo: b.fecha_bautismo,
      pastor_oficiante: b.pastor_oficiante,
      lugar_bautismo: b.lugar_bautismo,
      es_reposicion: b.es_reposicion,
      nota_reposicion: b.nota_reposicion
    };
    generarPDFBautismo(pdfData);
  };

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={closeConfirm}
      />

      <AnimatePresence mode="wait">
        {activeView === 'list' ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SPRING_SNAPPY}
            className="space-y-6"
          >
            {/* Header del Módulo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-slate-200/80 shadow-2xs mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Sacramentos & Actas Canónicas • ICLEB
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                  Fe de Bautismo
                </h1>
                <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
                  Registro parroquial canónico y emisión oficial de certificados en formato Carta.
                </p>
              </div>

              {canWrite && (
                <Button
                  onClick={openCreate}
                  className="gap-2 shrink-0 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nueva Acta</span>
                </Button>
              )}
            </div>

            {/* Fila de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Total de Bautismos</span>
                  <span className="block text-2xl sm:text-3xl font-black text-slate-900 mt-1">{total}</span>
                  <span className="block text-xs font-semibold text-slate-500 mt-0.5">Actas canónicas registradas</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <ScrollText className="w-6 h-6" />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Bautismos {currentYear}</span>
                  <span className="block text-2xl sm:text-3xl font-black text-emerald-600 mt-1">{esteAnio}</span>
                  <span className="block text-xs font-semibold text-slate-500 mt-0.5">Celebrados este año</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -2 }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex items-center justify-between"
              >
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Reposiciones de Fe</span>
                  <span className="block text-2xl sm:text-3xl font-black text-amber-600 mt-1">{reposiciones}</span>
                  <span className="block text-xs font-semibold text-slate-500 mt-0.5">Constancias históricas emitidas</span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
              </motion.div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, N° registro..."
                  className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-2xs transition-all"
                />
              </div>

              <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs font-semibold self-stretch sm:self-auto">
                <button
                  onClick={() => setFilterType('todos')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === 'todos' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({total})
                </button>
                <button
                  onClick={() => setFilterType('original')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === 'original' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Originales ({total - reposiciones})
                </button>
                <button
                  onClick={() => setFilterType('reposicion')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    filterType === 'reposicion' ? 'bg-slate-900 text-white shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reposiciones ({reposiciones})
                </button>
              </div>
            </div>

            {/* Listado de Actas */}
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs sm:text-sm animate-pulse">
                  Cargando actas de bautismo...
                </div>
              ) : filteredBautismos.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <ScrollText className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No se encontraron actas de bautismo</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchTerm ? 'Intenta buscar con otro término o limpia el buscador.' : 'Comienza registrando la primera acta de bautismo con el botón superior.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60 text-[10px] font-black uppercase text-slate-400 tracking-wider h-10">
                        <th className="py-2.5 px-4 sm:px-6">N° Registro</th>
                        <th className="py-2.5 px-4">Bautizado/a</th>
                        <th className="py-2.5 px-4 hidden md:table-cell">Fecha Bautismo</th>
                        <th className="py-2.5 px-4 hidden lg:table-cell">Pastor Oficiante</th>
                        <th className="py-2.5 px-4">Tipo</th>
                        <th className="py-2.5 px-4 sm:px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBautismos.map((b) => {
                        const d = new Date(b.fecha_bautismo);
                        const localD = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                        const fechaFormato = localD.toLocaleDateString('es-HN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        });

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs border border-slate-200">
                                #{b.numero_registro}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{b.nombre_persona}</div>
                              <div className="text-[11px] text-slate-400">
                                {b.genero === 'F' ? 'Femenino' : 'Masculino'} • {b.lugar_nacimiento}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 font-medium">
                              {fechaFormato}
                            </td>
                            <td className="py-3.5 px-4 hidden lg:table-cell text-slate-600">
                              {b.pastor_oficiante}
                            </td>
                            <td className="py-3.5 px-4">
                              {b.es_reposicion ? (
                                <Badge variant="warning" className="text-[10px]">
                                  Reposición
                                </Badge>
                              ) : (
                                <Badge variant="success" className="text-[10px]">
                                  Original
                                </Badge>
                              )}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  size="icon"
                                  onClick={() => handleDownloadPDF(b)}
                                  title="Descargar Certificado Oficial en PDF"
                                  className="h-8 w-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-white"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </Button>
                                {canWrite && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => openEdit(b)}
                                      title="Editar Acta"
                                      className="h-8 w-8 rounded-xl"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => handleDelete(b)}
                                      title="Eliminar Acta"
                                      className="h-8 w-8 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={SPRING_FAST}
            className="max-w-3xl mx-auto"
          >
            <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/80 shadow-2xs">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                    {editingItem ? 'Editar Acta de Bautismo' : 'Nueva Acta de Bautismo'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Completa la información formal requerida para el libro canónico y el certificado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2">
                  <svg className="w-4 h-4 text-rose-600 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Selector de Miembro Existente (Opcional) */}
                {!editingItem && miembros && miembros.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vincular con Miembro del Padrón (Opcional)
                    </label>
                    <select
                      onChange={handleSelectMiembro}
                      defaultValue=""
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      <option value="">-- Ingreso manual de persona externa o nuevo infante --</option>
                      {miembros.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} {m.bautizado ? '(Ya figura bautizado)' : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Si seleccionas un miembro, sus datos se autocompletarán y quedará marcado como bautizado.
                    </p>
                  </div>
                )}

                {/* Datos del Acta */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      N° Registro Canónico *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.numero_registro}
                      onChange={e => setForm({ ...form, numero_registro: e.target.value })}
                      placeholder="Ej. 87 o 2026-087"
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre Completo de la Persona Bautizada *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nombre_persona}
                      onChange={e => setForm({ ...form, nombre_persona: e.target.value })}
                      placeholder="Ej. Delmy Marleny Lainez Sáenz"
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Género Sacramental
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, genero: 'M' })}
                        className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          form.genero === 'M'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Hijo (M)
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, genero: 'F' })}
                        className={`py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          form.genero === 'F'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Hija (F)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha de Nacimiento *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.fecha_nacimiento}
                      onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })}
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lugar de Nacimiento *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.lugar_nacimiento}
                      onChange={e => setForm({ ...form, lugar_nacimiento: e.target.value })}
                      placeholder="Ciudad, Depto, País"
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                {/* Familia & Testigos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre del Padre
                    </label>
                    <input
                      type="text"
                      value={form.padre}
                      onChange={e => setForm({ ...form, padre: e.target.value })}
                      placeholder="Ej. Santos Lainez"
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nombre de la Madre
                    </label>
                    <input
                      type="text"
                      value={form.madre}
                      onChange={e => setForm({ ...form, madre: e.target.value })}
                      placeholder="Ej. María Inez Sáenz"
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Padrinos / Testigos (Opcional)
                  </label>
                  <input
                    type="text"
                    value={form.padrinos}
                    onChange={e => setForm({ ...form, padrinos: e.target.value })}
                    placeholder="Ej. Juan Pérez y Elena Gómez"
                    className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                {/* Datos del Sacramento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha del Santo Bautismo *
                    </label>
                    <input
                      type="date"
                      required
                      value={form.fecha_bautismo}
                      onChange={e => setForm({ ...form, fecha_bautismo: e.target.value })}
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pastor Oficiante / Ministro *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.pastor_oficiante}
                      onChange={e => setForm({ ...form, pastor_oficiante: e.target.value })}
                      placeholder="Ej. Pr. Mario Antonio Ortega"
                      className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lugar del Bautismo
                  </label>
                  <input
                    type="text"
                    value={form.lugar_bautismo}
                    onChange={e => setForm({ ...form, lugar_bautismo: e.target.value })}
                    placeholder="Iglesia Cristiana Luterana El Buen Pastor, SPS"
                    className="block w-full rounded-xl bg-white border border-slate-200/90 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                {/* Sección de Reposición Histórica */}
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.es_reposicion}
                      onChange={e => setForm({ ...form, es_reposicion: e.target.checked })}
                      className="w-4 h-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500/20 accent-amber-600 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-bold text-amber-900">
                      Es una Reposición de Fe de Bautismo
                    </span>
                  </label>
                  <p className="text-[11px] text-amber-800/80">
                    Marca esta casilla si el documento es una reposición de un bautismo histórico celebrado en el pasado por otro ministro o en otra fecha.
                  </p>

                  {form.es_reposicion && (
                    <div className="pt-2">
                      <label className="block text-xs font-bold text-amber-900 mb-1">
                        Nota de la Reposición Histórica
                      </label>
                      <input
                        type="text"
                        value={form.nota_reposicion}
                        onChange={e => setForm({ ...form, nota_reposicion: e.target.value })}
                        placeholder="Ej. Acto realizado por el Pastor Ramón Rodríguez el 09-12-1990"
                        className="block w-full rounded-xl bg-white border border-amber-300 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveView('list')}
                    className="w-full sm:w-auto"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : editingItem
                      ? 'Actualizar Acta'
                      : 'Guardar y Generar PDF'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
