import { useState, useMemo, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ConfirmModal, useConfirm } from './ConfirmModal';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';
import { generarPDFBautismo, type BautismoPDFData } from '../lib/pdfBautismo';

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                    Sacramentos & Actas Canónicas
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Fe de Bautismo
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
                  Registro parroquial de bautismos y generación de certificados oficiales en formato Carta.
                </p>
              </div>

              {canWrite && (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span>Nueva Acta</span>
                </button>
              )}
            </div>

            {/* Fila de KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel p-5 rounded-2xl">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Bautismos</span>
                <span className="block text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">{total}</span>
                <span className="block text-xs text-slate-500 font-medium mt-0.5">Actas registradas en el libro</span>
              </div>
              <div className="glass-panel p-5 rounded-2xl">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bautismos {currentYear}</span>
                <span className="block text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">{esteAnio}</span>
                <span className="block text-xs text-slate-500 font-medium mt-0.5">Celebrados este año</span>
              </div>
              <div className="glass-panel p-5 rounded-2xl">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reposiciones de Fe</span>
                <span className="block text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1">{reposiciones}</span>
                <span className="block text-xs text-slate-500 font-medium mt-0.5">Constancias históricas emitidas</span>
              </div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre, N° registro..."
                  className="block w-full rounded-2xl bg-white border border-slate-200/90 pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/60 text-xs font-semibold self-stretch sm:self-auto">
                <button
                  onClick={() => setFilterType('todos')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'todos' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({total})
                </button>
                <button
                  onClick={() => setFilterType('original')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'original' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Originales ({total - reposiciones})
                </button>
                <button
                  onClick={() => setFilterType('reposicion')}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl transition-all ${
                    filterType === 'reposicion' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Reposiciones ({reposiciones})
                </button>
              </div>
            </div>

            {/* Listado de Actas */}
            <div className="glass-panel rounded-3xl overflow-hidden shadow-2xs">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 text-xs sm:text-sm animate-pulse">
                  Cargando actas de bautismo...
                </div>
              ) : filteredBautismos.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                    <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
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
                      <tr className="border-b border-slate-200/70 bg-slate-50/50 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <th className="py-3.5 px-4 sm:px-6">N° Registro</th>
                        <th className="py-3.5 px-4">Bautizado/a</th>
                        <th className="py-3.5 px-4 hidden md:table-cell">Fecha Bautismo</th>
                        <th className="py-3.5 px-4 hidden lg:table-cell">Pastor Oficiante</th>
                        <th className="py-3.5 px-4">Tipo</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">Acciones</th>
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
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
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
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                  Reposición
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Original
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 sm:px-6 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  onClick={() => handleDownloadPDF(b)}
                                  title="Descargar Certificado Oficial en PDF"
                                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-2xs cursor-pointer"
                                >
                                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                  </svg>
                                </button>
                                {canWrite && (
                                  <>
                                    <button
                                      onClick={() => openEdit(b)}
                                      title="Editar Acta"
                                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-all cursor-pointer"
                                    >
                                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDelete(b)}
                                      title="Eliminar Acta"
                                      className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
                                    >
                                      <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                      </svg>
                                    </button>
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
            <div className="glass-panel p-6 sm:p-9 rounded-3xl">
              <div className="flex items-center justify-between pb-6 border-b border-slate-200/70 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    {editingItem ? 'Editar Acta de Bautismo' : 'Nueva Acta de Bautismo'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Completa la información formal requerida para el libro canónico y el certificado.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveView('list')}
                  className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                >
                  <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
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
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setActiveView('list')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Guardando...'
                      : editingItem
                      ? 'Actualizar Acta'
                      : 'Guardar y Generar PDF'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
