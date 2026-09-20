import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { SPRING_SNAPPY, SPRING_FAST } from '../lib/animations';

interface Categoria { id: number; nombre: string; }
interface Talonario { id: number; nombre: string; rango_inicio: number; rango_fin: number; actual: number; activo: boolean; tipo: string; }
interface Transaccion {
  id: number;
  fecha: string;
  tipo: 'ingreso' | 'egreso';
  categoria: string;
  descripcion?: string;
  monto: number;
  recibo_no?: string;
  asistentes?: number;
  comulgantes?: number;
  recibido_por?: string;
}

const IOS_SPRING_FAST = SPRING_FAST;

// Categorías oficiales según el talonario físico de Comprobante de Ingresos
const OFFICIAL_INGRESO_SOURCES = [
  "Culto de Damas",
  "Culto de Caballeros",
  "Culto de Jóvenes",
  "Escuela Dominical",
  "Misa Dominical"
];

export default function FinanceDashboard() {
  const queryClient = useQueryClient();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.rol === 'admin';
  const canWrite = isAdmin || user.permisos?.finanzas === 'escritura' || user.permisos?.finanzas === 'admin';

  // Navigation: 'dashboard' (list), 'form' (inline receipt view), 'configuracion' (dedicated settings)
  const [activeView, setActiveView] = useState<'dashboard' | 'form' | 'configuracion'>('dashboard');
  const [activeTab, setActiveTab] = useState<'ingreso' | 'egreso'>('ingreso');
  const [configSubTab, setConfigSubTab] = useState<'todos' | 'ingreso' | 'egreso' | 'categorias'>('todos');

  // Transaction Form State
  const [editingTx, setEditingTx] = useState<Transaccion | null>(null);
  const [txForm, setTxForm] = useState({
    tipo: 'ingreso' as 'ingreso' | 'egreso',
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'Misa Dominical',
    descripcion: '',
    monto: '',
    recibo_no: '',
    asistentes: '',
    comulgantes: '',
    recibido_por: ''
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [formError, setFormError] = useState('');

  // Category State for Config
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Talonario Forms State
  const [talonarioForm, setTalonarioForm] = useState({ nombre: '', inicio: '', fin: '', actual: '', tipo: 'ingreso' });
  const [showNewTalForm, setShowNewTalForm] = useState(false);

  // Custom Confirm State
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const confirmAction = (title: string, message: string, onConfirm: () => void) => setConfirmDialog({ isOpen: true, title, message, onConfirm });

  // Fetch all finance data
  const { data, isLoading } = useQuery({ queryKey: ['finanzas'], queryFn: async () => (await api.get('/finanzas/datos')).data });
  const transacciones: Transaccion[] = data?.transacciones || [];
  const categorias: Categoria[] = data?.categorias || [];
  const talonarios: Talonario[] = data?.talonarios || [];

  // Metrics calculation
  const { saldo, ingresosMes, egresosMes, balanceMes, asistentesMes, comulgantesMes } = useMemo(() => {
    let saldo = 0, ingresosMes = 0, egresosMes = 0, asistentesMes = 0, comulgantesMes = 0;
    const now = new Date();
    const currMonth = now.getMonth(), currYear = now.getFullYear();
    transacciones.forEach(tx => {
      const txDate = new Date(tx.fecha);
      const isCurr = txDate.getMonth() === currMonth && txDate.getFullYear() === currYear;
      if (tx.tipo === 'ingreso') {
        saldo += tx.monto;
        if (isCurr) {
          ingresosMes += tx.monto;
          asistentesMes += tx.asistentes || 0;
          comulgantesMes += tx.comulgantes || 0;
        }
      } else {
        saldo -= tx.monto;
        if (isCurr) egresosMes += tx.monto;
      }
    });
    return { saldo, ingresosMes, egresosMes, balanceMes: ingresosMes - egresosMes, asistentesMes, comulgantesMes };
  }, [transacciones]);

  const formatLps = (val: number) => `L. ${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    return local.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Helper to format receipt number
  const formatReceiptNo = (val: string | number | undefined) => {
    if (!val) return '000000';
    const str = String(val).trim();
    const isPureNum = /^\d+$/.test(str);
    return isPureNum ? `№ ${str.padStart(6, '0')}` : str;
  };

  // Transactions mutations
  const createTxMutation = useMutation({
    mutationFn: (newTx: any) => api.post('/finanzas/transacciones', newTx),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finanzas'] });
      setActiveView('dashboard');
      setEditingTx(null);
    },
    onError: (err: any) => setFormError(err.response?.data?.error || 'Error al guardar la transacción.')
  });

  const updateTxMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => api.put(`/finanzas/transacciones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finanzas'] });
      setActiveView('dashboard');
      setEditingTx(null);
    },
    onError: (err: any) => setFormError(err.response?.data?.error || 'Error al actualizar la transacción.')
  });

  const deleteTxMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/finanzas/transacciones/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finanzas'] })
  });

  // Category mutations
  const createCatMutation = useMutation({
    mutationFn: (nombre: string) => api.post('/finanzas/categorias', { nombre }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['finanzas'] }); setNewCatName(''); }
  });
  const updateCatMutation = useMutation({
    mutationFn: ({ id, nombre }: { id: number, nombre: string }) => api.put(`/finanzas/categorias/${id}`, { nombre }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['finanzas'] }); setEditingCatId(null); }
  });
  const deleteCatMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/finanzas/categorias/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finanzas'] })
  });

  // Talonarios mutations
  const createTalMutation = useMutation({
    mutationFn: (tal: any) => api.post('/finanzas/talonarios', tal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finanzas'] });
      setTalonarioForm({ nombre: '', inicio: '', fin: '', actual: '', tipo: 'ingreso' });
      setShowNewTalForm(false);
    }
  });
  const updateTalMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => api.put(`/finanzas/talonarios/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finanzas'] })
  });
  const deleteTalMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/finanzas/talonarios/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finanzas'] })
  });
  const toggleTalMutation = useMutation({
    mutationFn: ({ id, activo, tipo }: { id: number, activo: boolean, tipo: string }) => api.put(`/finanzas/talonarios/${id}`, { activo, tipo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finanzas'] })
  });

  const getSiguienteRecibo = (tipo: string) => {
    const nums = transacciones.filter(t => t.tipo === tipo && t.recibo_no && !isNaN(parseInt(t.recibo_no, 10))).map(t => parseInt(t.recibo_no!, 10));
    const maxNo = nums.length > 0 ? Math.max(...nums) : 0;
    const sig = maxNo > 0 ? maxNo + 1 : 1;
    const talActivo = talonarios.find(t => t.tipo === tipo && t.activo);
    if (talActivo) return Math.max(talActivo.actual || talActivo.rango_inicio || 1, sig).toString();
    return sig.toString();
  };

  const openCreate = (tipo: 'ingreso' | 'egreso' = activeTab) => {
    setEditingTx(null);
    const sug = getSiguienteRecibo(tipo);
    const defaultCat = tipo === 'ingreso' ? 'Misa Dominical' : (categorias[0]?.nombre || 'Servicios Públicos');
    setTxForm({
      tipo,
      fecha: new Date().toISOString().split('T')[0],
      categoria: defaultCat,
      descripcion: '',
      monto: '',
      recibo_no: sug,
      asistentes: '',
      comulgantes: '',
      recibido_por: tipo === 'ingreso' ? 'Dilcia Sáenz' : ''
    });
    setIsCustomCategory(false);
    setCustomCategoryText('');
    setFormError('');
    setActiveView('form');
  };

  const openEdit = (tx: Transaccion) => {
    const d = new Date(tx.fecha);
    const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
    const yyyy = local.getFullYear();
    const mm = String(local.getMonth() + 1).padStart(2, '0');
    const dd = String(local.getDate()).padStart(2, '0');

    const isOfficial = OFFICIAL_INGRESO_SOURCES.includes(tx.categoria);
    setEditingTx(tx);
    setTxForm({
      tipo: tx.tipo,
      fecha: `${yyyy}-${mm}-${dd}`,
      categoria: tx.categoria,
      descripcion: tx.descripcion || '',
      monto: tx.monto.toString(),
      recibo_no: tx.recibo_no || '',
      asistentes: tx.asistentes ? tx.asistentes.toString() : '',
      comulgantes: tx.comulgantes ? tx.comulgantes.toString() : '',
      recibido_por: tx.tipo === 'ingreso' ? 'Dilcia Sáenz' : (tx.recibido_por || '')
    });

    if (tx.tipo === 'ingreso' && !isOfficial) {
      setIsCustomCategory(true);
      setCustomCategoryText(tx.categoria);
    } else {
      setIsCustomCategory(false);
      setCustomCategoryText('');
    }

    setFormError('');
    setActiveView('form');
  };

  const closeForm = () => {
    setActiveView('dashboard');
    setEditingTx(null);
  };

  const handleTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const finalCategory = (txForm.tipo === 'ingreso' && isCustomCategory)
      ? customCategoryText.trim() || 'Otros'
      : txForm.categoria;

    if (!finalCategory || !txForm.monto) {
      setFormError('La categoría y el monto son requeridos.');
      return;
    }

    const payload = {
      ...txForm,
      recibido_por: txForm.tipo === 'ingreso' ? 'Dilcia Sáenz' : txForm.recibido_por,
      categoria: finalCategory,
      monto: parseFloat(txForm.monto),
      asistentes: parseInt(txForm.asistentes, 10) || 0,
      comulgantes: parseInt(txForm.comulgantes, 10) || 0
    };

    if (editingTx) {
      updateTxMutation.mutate({ id: editingTx.id, data: payload });
    } else {
      const talActivo = talonarios.find(t => t.tipo === txForm.tipo && t.activo);
      if (!talActivo) {
        setFormError(`No hay talonario activo para "${txForm.tipo === 'ingreso' ? 'Ingresos' : 'Egresos'}". Ve a Configuración de Talonarios.`);
        return;
      }
      if (txForm.recibo_no) {
        const n = parseInt(txForm.recibo_no, 10);
        if (!isNaN(n) && (n < talActivo.rango_inicio || n > talActivo.rango_fin)) {
          setFormError(`Recibo #${txForm.recibo_no} fuera del rango activo (${talActivo.rango_inicio} - ${talActivo.rango_fin}).`);
          return;
        }
      }
      createTxMutation.mutate(payload);
    }
  };

  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) createCatMutation.mutate(newCatName.trim());
  };

  const handleSaveCatEdit = (id: number) => {
    if (editingCatName.trim()) {
      updateCatMutation.mutate({ id, nombre: editingCatName.trim() });
    }
  };

  const handleTalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (talonarioForm.nombre && talonarioForm.inicio && talonarioForm.fin) {
      createTalMutation.mutate(talonarioForm);
    }
  };

  const filteredTxs = transacciones.filter(tx => tx.tipo === activeTab);
  const talIngreso = talonarios.filter(t => t.tipo === 'ingreso');
  const talEgreso = talonarios.filter(t => t.tipo === 'egreso');

  return (
    <div className="min-h-full font-sans text-slate-900 pb-12">

      {/* ========== TOPBAR ========== */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          {activeView === 'form' ? (
            <div className="flex items-center gap-2 mb-2.5">
              <button
                onClick={closeForm}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Finanzas
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-900">
                {editingTx ? 'Editar Comprobante' : txForm.tipo === 'ingreso' ? 'Comprobante de Ingresos' : 'Comprobante de Egreso'}
              </span>
            </div>
          ) : activeView === 'configuracion' ? (
            <div className="flex items-center gap-2 mb-2.5">
              <button
                onClick={() => setActiveView('dashboard')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                Finanzas
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-bold text-slate-900">Configuración Independiente</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-white/80 shadow-xs mb-2.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">Control Financiero &bull; El Buen Pastor</span>
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Control de Finanzas
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            {activeView === 'form'
              ? 'Emisión y registro oficial de comprobantes según talonario físico.'
              : activeView === 'configuracion'
              ? 'Edita y administra talonarios correlativos y categorías en paneles dedicados.'
              : 'Control de ingresos, egresos, talonarios oficiales y balance mensual.'}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {activeView === 'dashboard' ? (
            <>
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                transition={IOS_SPRING_FAST}
                onClick={() => setActiveView('configuracion')}
                className="glass-button-secondary flex-1 sm:flex-initial inline-flex items-center justify-center rounded-2xl text-xs font-bold text-slate-700 h-11 px-4 gap-2 cursor-pointer shadow-xs"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Configuración
              </motion.button>
              {canWrite && (
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  transition={IOS_SPRING_FAST}
                  onClick={() => openCreate('ingreso')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center rounded-2xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-[0_4px_14px_rgba(15,23,42,0.18)] h-11 px-5 transition-colors gap-2 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Nuevo Comprobante
                </motion.button>
              )}
            </>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.97 }}
              transition={IOS_SPRING_FAST}
              onClick={() => setActiveView('dashboard')}
              className="glass-button-secondary w-full sm:w-auto inline-flex items-center justify-center rounded-2xl text-xs font-bold text-slate-700 h-11 px-5 gap-2 cursor-pointer shadow-xs"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Volver al Resumen
            </motion.button>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ==================== VISTA DASHBOARD (LISTADO) ==================== */}
        {activeView === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1, ease: 'easeOut' } }}
            transition={SPRING_SNAPPY}
          >
            {/* Metric Cards */}
            <div className="grid gap-3.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <MetricGlassCard title="Saldo Actual" amount={formatLps(saldo)} trend="Balance acumulado global" trendType="neutral" iconType="wallet" colorTheme="emerald" />
              <MetricGlassCard
                title="Ingresos del Mes"
                amount={formatLps(ingresosMes)}
                trend={`${asistentesMes} asist. • ${comulgantesMes} comulg.`}
                trendType="positive"
                iconType="trending-up"
                colorTheme="blue"
              />
              <MetricGlassCard title="Egresos del Mes" amount={formatLps(egresosMes)} trend="Total gastos este mes" trendType="negative" iconType="trending-down" colorTheme="rose" />
              <MetricGlassCard title="Balance Mensual" amount={formatLps(balanceMes)} trend={balanceMes >= 0 ? '+ Superávit del mes' : '- Déficit del mes'} trendType={balanceMes >= 0 ? 'positive' : 'negative'} iconType="scale" colorTheme={balanceMes >= 0 ? 'indigo' : 'rose'} />
            </div>

            {/* Transactions Table Panel */}
            <div className="glass-panel rounded-2xl sm:rounded-[2rem] overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-white/60 gap-4">
                <div className="glass-panel-subtle flex p-1.5 rounded-2xl gap-1 w-full sm:w-auto">
                  <button onClick={() => setActiveTab('ingreso')} className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-3 sm:px-5 py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${activeTab === 'ingreso' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'}`}>
                    <span className={`w-2 h-2 rounded-full ${activeTab === 'ingreso' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    Comprobantes de Ingresos
                  </button>
                  <button onClick={() => setActiveTab('egreso')} className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-3 sm:px-5 py-2 text-xs font-bold transition-all duration-150 cursor-pointer ${activeTab === 'egreso' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'}`}>
                    <span className={`w-2 h-2 rounded-full ${activeTab === 'egreso' ? 'bg-rose-500' : 'bg-slate-300'}`}></span>
                    Comprobantes de Egresos
                  </button>
                </div>
                <div className="text-xs font-bold text-slate-500 text-right sm:text-left">Mostrando <span className="text-slate-900">{filteredTxs.length}</span> registros</div>
              </div>

              <div className="p-2 sm:p-4">
                <div className="relative w-full overflow-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[660px]">
                    <thead>
                      <tr className="border-b border-white/60">
                        <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px] w-[120px]">Fecha</th>
                        <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">No. Recibo</th>
                        <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Concepto / Servicio</th>
                        {activeTab === 'ingreso' && (
                          <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">Asistencia / Comunión</th>
                        )}
                        <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px]">
                          {activeTab === 'ingreso' ? 'Recibido Por' : 'Descripción / Beneficiario'}
                        </th>
                        <th className="h-11 px-5 font-bold text-slate-400 uppercase tracking-wider text-[11px] text-right">Monto (L.)</th>
                        {canWrite && <th className="h-11 px-5 w-24 text-right font-bold text-slate-400 uppercase tracking-wider text-[11px]">Acciones</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/40">
                      {isLoading ? (
                        <tr><td colSpan={canWrite ? 7 : 6} className="py-20 text-center text-xs font-medium text-slate-400">Cargando transacciones...</td></tr>
                      ) : filteredTxs.length === 0 ? (
                        <tr><td colSpan={canWrite ? 7 : 6} className="py-20 text-center">
                          <div className="mx-auto w-14 h-14 rounded-2xl bg-white/70 border border-white flex items-center justify-center mb-3 text-slate-400 shadow-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </div>
                          <p className="text-base font-bold text-slate-800">No hay {activeTab}s registrados</p>
                          <p className="text-xs font-medium text-slate-400 mt-0.5">Registra un nuevo comprobante para comenzar.</p>
                          {canWrite && (
                            <button onClick={() => openCreate(activeTab)} className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors">
                              + Crear primer {activeTab}
                            </button>
                          )}
                        </td></tr>
                      ) : (
                        filteredTxs.map((tx) => (
                          <tr key={tx.id} className="group transition-colors duration-150 hover:bg-white/70 rounded-2xl">
                            <td className="px-5 py-4 align-middle font-semibold text-xs text-slate-600 rounded-l-2xl">
                              {formatDate(tx.fecha)}
                            </td>
                            <td className="px-5 py-4 align-middle">
                              {tx.recibo_no ? (
                                <span className="inline-flex items-center rounded-xl bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-700 border border-white/80 shadow-2xs">
                                  {formatReceiptNo(tx.recibo_no)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-5 py-4 align-middle">
                              <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-semibold border ${
                                tx.tipo === 'ingreso'
                                  ? 'bg-emerald-50/80 text-emerald-800 border-emerald-200/70'
                                  : 'bg-slate-100 text-slate-700 border-white/80'
                              }`}>
                                {tx.categoria}
                              </span>
                            </td>

                            {activeTab === 'ingreso' && (
                              <td className="px-5 py-4 align-middle">
                                <div className="flex items-center gap-2">
                                  {(tx.asistentes !== undefined && tx.asistentes > 0) ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 border border-sky-100" title="Asistentes al Culto">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                      <span>{tx.asistentes}</span>
                                    </span>
                                  ) : null}
                                  {(tx.comulgantes !== undefined && tx.comulgantes > 0) ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100" title="Comulgantes (Santa Cena)">
                                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M8 2h8l-1 9a4 4 0 0 1-8 0L6 2h2z"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                                      <span>{tx.comulgantes}</span>
                                    </span>
                                  ) : null}
                                  {(!tx.asistentes && !tx.comulgantes) && (
                                    <span className="text-slate-300 text-xs">-</span>
                                  )}
                                </div>
                              </td>
                            )}

                            <td className="px-5 py-4 align-middle text-slate-600 max-w-[240px] truncate text-xs">
                              {activeTab === 'ingreso' ? (
                                <span className="font-semibold text-slate-700 inline-flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                                  <span>{tx.recibido_por || 'Dilcia Sáenz'}</span>
                                </span>
                              ) : tx.recibido_por ? (
                                <span className="font-semibold text-slate-700 inline-flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                                  <span>{tx.recibido_por}</span>
                                </span>
                              ) : tx.descripcion ? (
                                <span className="font-medium text-slate-600">{tx.descripcion}</span>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </td>

                            <td className="px-5 py-4 align-middle text-right text-xs font-bold">
                              <span className={tx.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}>
                                {tx.tipo === 'ingreso' ? '+ ' : '- '}
                                {formatLps(tx.monto)}
                              </span>
                            </td>

                            {canWrite && (
                              <td className="px-5 py-4 align-middle text-right rounded-r-2xl">
                                <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => openEdit(tx)}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                                    title="Editar comprobante"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                  </button>
                                  <button
                                    onClick={() => confirmAction('Eliminar Comprobante', `¿Estás seguro de eliminar el registro de ${tx.categoria} por ${formatLps(tx.monto)}?`, () => deleteTxMutation.mutate(tx.id))}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
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
          </motion.div>
        )}

        {/* ==================== VISTA FORMULARIO INLINE (COMPROBANTE BENTO) ==================== */}
        {activeView === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1, ease: 'easeOut' } }}
            transition={SPRING_SNAPPY}
            className="max-w-2xl mx-auto"
          >
            <form onSubmit={handleTxSubmit} className="space-y-4">

              {formError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING_FAST}
                  className="p-3.5 rounded-2xl bg-rose-50/90 border border-rose-200/80 text-rose-700 text-xs font-bold flex items-center gap-2.5 shadow-xs"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>{formError}</span>
                </motion.div>
              )}

              {/* Selector de Tipo (Ingreso / Egreso) si no está editando */}
              {!editingTx && (
                <div className="glass-panel-subtle flex items-center rounded-2xl p-1 gap-1 max-w-sm mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        tipo: 'ingreso',
                        categoria: 'Misa Dominical',
                        recibo_no: getSiguienteRecibo('ingreso')
                      });
                      setIsCustomCategory(false);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      txForm.tipo === 'ingreso' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Comprobante de Ingreso (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxForm({
                        ...txForm,
                        tipo: 'egreso',
                        categoria: categorias[0]?.nombre || 'Servicios Públicos',
                        recibo_no: getSiguienteRecibo('egreso')
                      });
                      setIsCustomCategory(false);
                    }}
                    className={`flex-1 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                      txForm.tipo === 'egreso' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Comprobante de Egreso (-)
                  </button>
                </div>
              )}

              {/* TARJETA PRINCIPAL TIPO COMPROBANTE FÍSICO */}
              <div className="glass-panel rounded-2xl sm:rounded-[2rem] p-4 sm:p-8 border border-white/90 space-y-5 sm:space-y-6 shadow-sm relative overflow-hidden">

                {/* Encabezado inspirado en el talonario físico */}
                <div className="border-b border-slate-200/80 pb-5 text-center relative">
                  <div className="flex items-center justify-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
                    <span>Iglesia Cristiana Luterana &ldquo;El Buen Pastor&rdquo;</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 italic">San Pedro Sula, Honduras, C.A.</p>

                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-wider mt-2">
                    {txForm.tipo === 'ingreso' ? 'Comprobante de Ingresos' : 'Comprobante de Egresos'}
                  </h2>

                  {/* Número de comprobante correlativo */}
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs shadow-2xs">
                    <span>{formatReceiptNo(txForm.recibo_no)}</span>
                  </div>
                </div>

                {/* SECCIÓN 1: FUENTE DE INGRESOS (CHECKBOXES / BOTONES DIRECTOS) */}
                {txForm.tipo === 'ingreso' ? (
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      Ingresos Recibidos de: <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {OFFICIAL_INGRESO_SOURCES.map(source => {
                        const isSelected = !isCustomCategory && txForm.categoria === source;
                        return (
                          <button
                            key={source}
                            type="button"
                            onClick={() => {
                              setIsCustomCategory(false);
                              setTxForm({ ...txForm, categoria: source });
                            }}
                            className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white/70 text-slate-700 border-white/90 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded-lg flex items-center justify-center border text-[10px] ${
                              isSelected ? 'bg-white text-slate-900 border-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                            </span>
                            <span>{source}</span>
                          </button>
                        );
                      })}

                      {/* Opción Otros */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomCategory(true);
                          setTxForm({ ...txForm, categoria: customCategoryText || 'Otros' });
                        }}
                        className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold transition-all text-left cursor-pointer ${
                          isCustomCategory
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white/70 text-slate-700 border-white/90 hover:bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-lg flex items-center justify-center border text-[10px] ${
                          isCustomCategory ? 'bg-white text-slate-900 border-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isCustomCategory && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          )}
                        </span>
                        <span>Otros (Especificar)</span>
                      </button>
                    </div>

                    {/* Campo de texto si seleccionó Otros */}
                    {isCustomCategory && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={IOS_SPRING_FAST}
                        className="mt-2.5 overflow-hidden"
                      >
                        <input
                          type="text"
                          required
                          placeholder="Especifica el concepto (Ej. Ofrenda Pro-Templo, Donación, etc.)..."
                          value={customCategoryText}
                          onChange={e => {
                            setCustomCategoryText(e.target.value);
                            setTxForm({ ...txForm, categoria: e.target.value });
                          }}
                          className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                        />
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                      Categoría de Egreso / Gasto: <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={txForm.categoria}
                      onChange={e => setTxForm({ ...txForm, categoria: e.target.value })}
                      className="glass-input w-full rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      {categorias.map(c => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* SECCIÓN 2: MONTO, FECHA Y NO. RECIBO */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {/* Lempiras */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Lempiras (L.) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={txForm.monto}
                        onChange={e => setTxForm({ ...txForm, monto: e.target.value })}
                        className="glass-input w-full rounded-2xl px-4 py-2.5 pl-9 text-sm font-extrabold text-slate-900 focus:outline-none"
                      />
                      <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400 pointer-events-none">L.</span>
                    </div>
                  </div>

                  {/* Fecha */}
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Fecha <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={txForm.fecha}
                      onChange={e => setTxForm({ ...txForm, fecha: e.target.value })}
                      className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* No. Recibo */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        No. Recibo
                      </label>
                      {txForm.recibo_no !== getSiguienteRecibo(txForm.tipo) && (
                        <button
                          type="button"
                          onClick={() => setTxForm({ ...txForm, recibo_no: getSiguienteRecibo(txForm.tipo) })}
                          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Restablecer
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={`Ej. ${getSiguienteRecibo(txForm.tipo)}`}
                      value={txForm.recibo_no}
                      onChange={e => setTxForm({ ...txForm, recibo_no: e.target.value })}
                      className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* SECCIÓN 3: ASISTENTES & COMULGANTES (CAMPOS DEL TALONARIO OFICIAL) */}
                {txForm.tipo === 'ingreso' && (
                  <div className="p-4 rounded-2xl bg-white/60 border border-white/80 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-sky-600"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                        <span>Asistentes al Culto</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Total presentes (Ej. 45)"
                        value={txForm.asistentes}
                        onChange={e => setTxForm({ ...txForm, asistentes: e.target.value })}
                        className="glass-input w-full rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600"><path d="M8 2h8l-1 9a4 4 0 0 1-8 0L6 2h2z"/><line x1="12" y1="15" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/></svg>
                        <span>Comulgantes (Santa Cena)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Total comulgantes (Ej. 30)"
                        value={txForm.comulgantes}
                        onChange={e => setTxForm({ ...txForm, comulgantes: e.target.value })}
                        className="glass-input w-full rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* SECCIÓN 4: FIRMA / RECIBIDO POR Y DETALLES */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {txForm.tipo === 'ingreso' ? (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                        <span>Tesorera Oficial (Recibido Por)</span>
                      </label>
                      <div className="glass-panel-subtle flex items-center justify-between px-4 py-2.5 rounded-2xl border border-white/80 bg-white/50 cursor-default select-none shadow-2xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="text-xs font-bold text-slate-900">Dilcia Sáenz</span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-white/90 px-2.5 py-0.5 rounded-lg border border-slate-200/70 shadow-2xs">
                          Tesorera
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
                        <span>Autorizado / Entregado Por</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Nombre de quien entrega/autoriza..."
                        value={txForm.recibido_por}
                        onChange={e => setTxForm({ ...txForm, recibido_por: e.target.value })}
                        className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                      Detalles / Observaciones <span className="font-normal normal-case text-slate-400">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Notas adicionales..."
                      value={txForm.descripcion}
                      onChange={e => setTxForm({ ...txForm, descripcion: e.target.value })}
                      className="glass-input w-full rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="pt-4 border-t border-slate-200/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="glass-button-secondary w-full sm:w-auto px-6 py-3 rounded-2xl text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancelar y Volver
                  </button>
                  <motion.button
                    type="submit"
                    disabled={createTxMutation.isPending || updateTxMutation.isPending}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    transition={IOS_SPRING_FAST}
                    className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-slate-900 text-white text-xs font-extrabold shadow-[0_4px_14px_rgba(15,23,42,0.18)] hover:bg-slate-800 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {createTxMutation.isPending || updateTxMutation.isPending
                      ? 'Guardando...'
                      : editingTx
                      ? 'Guardar Modificaciones'
                      : txForm.tipo === 'ingreso'
                      ? 'Registrar Comprobante de Ingreso'
                      : 'Registrar Comprobante de Egreso'}
                  </motion.button>
                </div>

              </div>
            </form>
          </motion.div>
        )}

        {/* ==================== VISTA CONFIGURACIÓN DEDICADA ==================== */}
        {activeView === 'configuracion' && (
          <motion.div
            key="configuracion"
            initial={{ opacity: 0, y: 6, scale: 0.995 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.1, ease: 'easeOut' } }}
            transition={SPRING_SNAPPY}
            className="space-y-6 sm:space-y-8"
          >
            {!isAdmin && (
              <div className="text-xs font-bold text-amber-700 bg-amber-50/90 p-4 rounded-2xl border border-amber-200/60">
                Modo lectura: Solo los administradores pueden registrar o editar configuraciones.
              </div>
            )}

            {/* Segmented Filter for Configuration Sections */}
            <div className="glass-panel-subtle flex p-1.5 rounded-2xl gap-1 overflow-x-auto custom-scrollbar w-full sm:w-auto">
              <button
                onClick={() => setConfigSubTab('todos')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${configSubTab === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Ver Todo
              </button>
              <button
                onClick={() => setConfigSubTab('ingreso')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${configSubTab === 'ingreso' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Talonarios de Ingreso ({talIngreso.length})
              </button>
              <button
                onClick={() => setConfigSubTab('egreso')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${configSubTab === 'egreso' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Talonarios de Egreso ({talEgreso.length})
              </button>
              <button
                onClick={() => setConfigSubTab('categorias')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${configSubTab === 'categorias' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                Categorías ({categorias.length})
              </button>
            </div>

            {/* SECCIÓN 1: TALONARIOS DE INGRESOS */}
            {(configSubTab === 'todos' || configSubTab === 'ingreso') && (
              <TalonarioSection
                titulo="Talonarios de Ingresos"
                subtitulo="Control de correlativos y recibos emitidos para entradas de fondos"
                tipo="ingreso"
                colorTheme="emerald"
                talonarios={talIngreso}
                isAdmin={canWrite}
                showNewTalForm={showNewTalForm && talonarioForm.tipo === 'ingreso'}
                talonarioForm={talonarioForm}
                setTalonarioForm={setTalonarioForm}
                onOpenForm={() => { setTalonarioForm({ nombre: '', inicio: '', fin: '', actual: '', tipo: 'ingreso' }); setShowNewTalForm(true); }}
                onCloseForm={() => setShowNewTalForm(false)}
                onSubmit={handleTalSubmit}
                onToggle={(id, activo, tipo) => toggleTalMutation.mutate({ id, activo, tipo })}
                onUpdate={(id, data) => updateTalMutation.mutate({ id, data })}
                onDelete={(id) => confirmAction('Eliminar Talonario', '¿Deseas eliminar este talonario del sistema permanentemente?', () => deleteTalMutation.mutate(id))}
                isPending={createTalMutation.isPending}
              />
            )}

            {/* SECCIÓN 2: TALONARIOS DE EGRESOS */}
            {(configSubTab === 'todos' || configSubTab === 'egreso') && (
              <TalonarioSection
                titulo="Talonarios de Egresos"
                subtitulo="Control de correlativos y comprobantes para salidas o gastos autorizados"
                tipo="egreso"
                colorTheme="rose"
                talonarios={talEgreso}
                isAdmin={canWrite}
                showNewTalForm={showNewTalForm && talonarioForm.tipo === 'egreso'}
                talonarioForm={talonarioForm}
                setTalonarioForm={setTalonarioForm}
                onOpenForm={() => { setTalonarioForm({ nombre: '', inicio: '', fin: '', actual: '', tipo: 'egreso' }); setShowNewTalForm(true); }}
                onCloseForm={() => setShowNewTalForm(false)}
                onSubmit={handleTalSubmit}
                onToggle={(id, activo, tipo) => toggleTalMutation.mutate({ id, activo, tipo })}
                onUpdate={(id, data) => updateTalMutation.mutate({ id, data })}
                onDelete={(id) => confirmAction('Eliminar Talonario', '¿Deseas eliminar este talonario del sistema permanentemente?', () => deleteTalMutation.mutate(id))}
                isPending={createTalMutation.isPending}
              />
            )}

            {/* SECCIÓN 3: CATEGORÍAS CONTABLES */}
            {(configSubTab === 'todos' || configSubTab === 'categorias') && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-slate-900">Categorías Contables</h2>
                      <p className="text-xs font-medium text-slate-400">Clasificación de transacciones &bull; Edita o renombra directamente</p>
                    </div>
                  </div>
                </div>

                <div className="glass-panel rounded-[2rem] p-6 sm:p-7 space-y-6">
                  {canWrite && (
                    <form onSubmit={handleCatSubmit} className="flex gap-2.5 max-w-md">
                      <input
                        type="text"
                        placeholder="Nombre de nueva categoría..."
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        className="glass-input flex-1 rounded-2xl px-4 py-2.5 text-xs font-semibold focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!newCatName.trim() || createCatMutation.isPending}
                        className="rounded-2xl bg-slate-900 px-6 text-xs font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xs cursor-pointer"
                      >
                        {createCatMutation.isPending ? 'Guardando...' : 'Agregar'}
                      </button>
                    </form>
                  )}

                  {categorias.length === 0 ? (
                    <p className="text-xs font-medium text-slate-400 text-center py-8">No hay categorías registradas.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <AnimatePresence>
                        {categorias.map(c => {
                          const isEditing = editingCatId === c.id;
                          return (
                            <motion.div
                              key={c.id}
                              layout
                              initial={{ opacity: 0, scale: 0.92 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85 }}
                              className="glass-panel-subtle flex items-center justify-between p-3.5 rounded-2xl border border-white/80 group"
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <input
                                    type="text"
                                    value={editingCatName}
                                    onChange={e => setEditingCatName(e.target.value)}
                                    className="glass-input flex-1 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none"
                                    autoFocus
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveCatEdit(c.id);
                                      if (e.key === 'Escape') setEditingCatId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveCatEdit(c.id)}
                                    className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                    title="Guardar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                  </button>
                                  <button
                                    onClick={() => setEditingCatId(null)}
                                    className="w-7 h-7 rounded-xl text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs transition-colors shrink-0 cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-xs font-bold text-slate-800 truncate pr-2">{c.nombre}</span>
                                  {canWrite && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <button
                                        onClick={() => { setEditingCatId(c.id); setEditingCatName(c.nombre); }}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-white transition-colors cursor-pointer"
                                        title="Editar nombre"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                      </button>
                                      <button
                                        onClick={() => confirmAction('Eliminar Categoría', `¿Deseas eliminar la categoría "${c.nombre}"?`, () => deleteCatMutation.mutate(c.id))}
                                        className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Eliminar"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </section>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({...prev, isOpen: false}))}
      />
    </div>
  );
}

// ========== SUBCOMPONENTE: SECCIÓN DE TALONARIOS CON EDICIÓN INLINE ==========
interface TalonarioSectionProps {
  titulo: string;
  subtitulo: string;
  tipo: string;
  colorTheme: 'emerald' | 'rose';
  talonarios: Talonario[];
  isAdmin: boolean;
  showNewTalForm: boolean;
  talonarioForm: any;
  setTalonarioForm: (f: any) => void;
  onOpenForm: () => void;
  onCloseForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggle: (id: number, activo: boolean, tipo: string) => void;
  onUpdate: (id: number, data: any) => void;
  onDelete: (id: number) => void;
  isPending: boolean;
}

function TalonarioSection({
  titulo, subtitulo, tipo, colorTheme, talonarios, isAdmin, showNewTalForm,
  talonarioForm, setTalonarioForm, onOpenForm, onCloseForm, onSubmit,
  onToggle, onUpdate, onDelete, isPending
}: TalonarioSectionProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ nombre: '', inicio: 0, fin: 0, actual: 0 });

  const themes = {
    emerald: {
      iconBg: 'bg-emerald-50', iconBorder: 'border-emerald-100', iconText: 'text-emerald-600',
      activeBg: 'bg-emerald-50/60 border-emerald-200/80', activeDot: 'bg-emerald-500',
      activeBadge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      activateBtn: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
    },
    rose: {
      iconBg: 'bg-rose-50', iconBorder: 'border-rose-100', iconText: 'text-rose-500',
      activeBg: 'bg-rose-50/40 border-rose-200/60', activeDot: 'bg-rose-500',
      activeBadge: 'bg-rose-100 text-rose-700 border-rose-200',
      activateBtn: 'text-rose-700 border-rose-200 hover:bg-rose-50'
    },
  };
  const th = themes[colorTheme];

  const startEdit = (tal: Talonario) => {
    setEditingId(tal.id);
    setEditForm({
      nombre: tal.nombre,
      inicio: tal.rango_inicio,
      fin: tal.rango_fin,
      actual: tal.actual
    });
  };

  const handleSaveEdit = (id: number) => {
    onUpdate(id, {
      nombre: editForm.nombre,
      inicio: editForm.inicio,
      fin: editForm.fin,
      actual: editForm.actual
    });
    setEditingId(null);
  };

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl ${th.iconBg} border ${th.iconBorder} flex items-center justify-center ${th.iconText} shrink-0 shadow-xs`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">{titulo}</h2>
            <p className="text-xs font-medium text-slate-400">{subtitulo}</p>
          </div>
        </div>
        {isAdmin && !showNewTalForm && (
          <button
            onClick={onOpenForm}
            className="inline-flex items-center gap-1.5 rounded-2xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 h-9 px-4 transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Talonario
          </button>
        )}
      </div>

      <div className="glass-panel rounded-[2rem] p-6 sm:p-7 space-y-4">
        {/* Formulario Crear Talonario */}
        <AnimatePresence>
          {showNewTalForm && isAdmin && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={IOS_SPRING_FAST} className="overflow-hidden">
              <form onSubmit={onSubmit} className="glass-panel-subtle p-5 rounded-2xl border border-white/80 space-y-3.5 mb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Nuevo Talonario de {tipo === 'ingreso' ? 'Ingresos' : 'Egresos'}</h3>
                  <button type="button" onClick={onCloseForm} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input type="text" required placeholder="Nombre (Ej. Diezmos 2026)" value={talonarioForm.nombre} onChange={e => setTalonarioForm({...talonarioForm, nombre: e.target.value})} className="glass-input sm:col-span-2 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none" />
                  <input type="number" required placeholder="Rango Inicio (Ej. 1)" value={talonarioForm.inicio} onChange={e => setTalonarioForm({...talonarioForm, inicio: e.target.value})} className="glass-input rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none" />
                  <input type="number" required placeholder="Rango Fin (Ej. 500)" value={talonarioForm.fin} onChange={e => setTalonarioForm({...talonarioForm, fin: e.target.value})} className="glass-input rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none" />
                  <input type="number" required placeholder="Número Actual Inicial (Ej. 1)" value={talonarioForm.actual} onChange={e => setTalonarioForm({...talonarioForm, actual: e.target.value})} className="glass-input sm:col-span-2 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none" />
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button type="button" onClick={onCloseForm} className="glass-button-secondary flex-1 rounded-xl text-slate-700 text-xs font-bold py-2.5 cursor-pointer">Cancelar</button>
                  <button type="submit" disabled={isPending} className="flex-1 rounded-xl bg-slate-900 text-white font-bold py-2.5 hover:bg-slate-800 transition-colors text-xs shadow-xs disabled:opacity-60 cursor-pointer">
                    {isPending ? 'Creando...' : 'Crear Talonario'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {talonarios.length === 0 ? (
          <p className="text-xs font-medium text-slate-400 text-center py-8">No hay talonarios de {tipo === 'ingreso' ? 'ingresos' : 'egresos'} registrados.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {talonarios.map(tal => {
                const isEditing = editingId === tal.id;

                return (
                  <motion.div
                    key={tal.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={IOS_SPRING_FAST}
                    className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 transition-colors ${tal.activo ? th.activeBg : 'glass-panel-subtle border-white/80'}`}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600">Editando Talonario</span>
                          <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                          </button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Nombre</label>
                          <input
                            type="text"
                            value={editForm.nombre}
                            onChange={e => setEditForm({...editForm, nombre: e.target.value})}
                            className="glass-input w-full rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Inicio</label>
                            <input
                              type="number"
                              value={editForm.inicio}
                              onChange={e => setEditForm({...editForm, inicio: parseInt(e.target.value) || 0})}
                              className="glass-input w-full rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Actual</label>
                            <input
                              type="number"
                              value={editForm.actual}
                              onChange={e => setEditForm({...editForm, actual: parseInt(e.target.value) || 0})}
                              className="glass-input w-full rounded-xl px-2 py-1.5 text-xs font-bold text-indigo-600 focus:outline-none text-center"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Fin</label>
                            <input
                              type="number"
                              value={editForm.fin}
                              onChange={e => setEditForm({...editForm, fin: parseInt(e.target.value) || 0})}
                              className="glass-input w-full rounded-xl px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none text-center"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="glass-button-secondary flex-1 rounded-xl text-slate-600 text-xs font-bold py-2 cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(tal.id)}
                            className="flex-1 rounded-xl bg-slate-900 text-white text-xs font-bold py-2 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${tal.activo ? th.activeDot : 'bg-slate-300'}`}></div>
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm truncate block">{tal.nombre}</span>
                              <span className="text-[11px] font-medium text-slate-400">
                                {tal.activo ? 'Talonario Activo en uso' : 'Inactivo'}
                              </span>
                            </div>
                          </div>
                          {tal.activo && <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md border shrink-0 ${th.activeBadge}`}>Activo</span>}
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white/70 rounded-xl px-2 py-2.5 border border-white/90 shadow-2xs">
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Inicio</p>
                            <p className="text-sm font-extrabold text-slate-900 mt-0.5">{tal.rango_inicio}</p>
                          </div>
                          <div className="bg-white/70 rounded-xl px-2 py-2.5 border border-white/90 shadow-2xs">
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Actual</p>
                            <p className="text-sm font-extrabold text-indigo-600 mt-0.5">#{tal.actual}</p>
                          </div>
                          <div className="bg-white/70 rounded-xl px-2 py-2.5 border border-white/90 shadow-2xs">
                            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Fin</p>
                            <p className="text-sm font-extrabold text-slate-900 mt-0.5">{tal.rango_fin}</p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-2 pt-2 border-t border-white/60">
                            {!tal.activo ? (
                              <button onClick={() => onToggle(tal.id, true, tal.tipo)} className={`flex-1 text-xs font-bold bg-white border px-3 py-2 rounded-xl transition-colors shadow-xs cursor-pointer ${th.activateBtn}`}>
                                Activar
                              </button>
                            ) : (
                              <button onClick={() => onToggle(tal.id, false, tal.tipo)} className="flex-1 text-xs font-bold bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 px-3 py-2 rounded-xl transition-colors shadow-xs cursor-pointer">
                                Desactivar
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(tal)}
                              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                              title="Editar rango o nombre"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                              Editar
                            </button>
                            <button
                              onClick={() => onDelete(tal.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                              title="Eliminar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}

// ========== SUBCOMPONENTE: METRIC GLASS CARD ==========
function MetricGlassCard({ title, amount, trend, trendType, colorTheme, iconType }: {
  title: string; amount: string; trend?: string; trendType?: 'positive' | 'negative' | 'neutral';
  colorTheme: 'emerald' | 'blue' | 'rose' | 'indigo'; iconType: 'wallet' | 'trending-up' | 'trending-down' | 'scale';
}) {
  const getTheme = () => {
    switch (colorTheme) {
      case 'emerald': return { bg: 'bg-emerald-50/70', text: 'text-emerald-600', border: 'border-emerald-100' };
      case 'blue': return { bg: 'bg-blue-50/70', text: 'text-blue-600', border: 'border-blue-100' };
      case 'rose': return { bg: 'bg-rose-50/70', text: 'text-rose-600', border: 'border-rose-100' };
      case 'indigo': return { bg: 'bg-indigo-50/70', text: 'text-indigo-600', border: 'border-indigo-100' };
    }
  };
  const t = getTheme();
  return (
    <motion.div whileHover={{ y: -3, scale: 1.008 }} transition={IOS_SPRING_FAST} className="glass-panel rounded-[1.75rem] p-6 flex flex-col justify-between cursor-default">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">{title}</h3>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${t.bg} ${t.text} border ${t.border} shadow-xs`}>
          {iconType === 'wallet' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
          {iconType === 'trending-up' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
          {iconType === 'trending-down' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>}
          {iconType === 'scale' && <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/></svg>}
        </div>
      </div>
      <div>
        <p className="text-2xl lg:text-[26px] font-extrabold tracking-tight text-slate-900 leading-none mb-2">{amount}</p>
        {trend && <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${trendType === 'positive' ? 'text-emerald-600' : trendType === 'negative' ? 'text-rose-500' : 'text-slate-500'}`}><span className={`w-1.5 h-1.5 rounded-full inline-block ${trendType === 'positive' ? 'bg-emerald-500' : trendType === 'negative' ? 'bg-rose-400' : 'bg-slate-400'}`}></span>{trend}</p>}
      </div>
    </motion.div>
  );
}

// ========== SUBCOMPONENTE: CONFIRM MODAL ==========
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-md p-4" onClick={onCancel}>
          <motion.div initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={IOS_SPRING_FAST} className="glass-panel-elevated rounded-[2rem] w-full max-w-sm overflow-hidden p-7 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 text-rose-500 shadow-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-1.5">{title}</h3>
            <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed">{message}</p>
            <div className="flex gap-2.5">
              <button onClick={onCancel} className="glass-button-secondary flex-1 rounded-2xl text-slate-700 text-xs font-bold py-3 cursor-pointer">Cancelar</button>
              <button onClick={() => { onConfirm(); onCancel(); }} className="flex-1 rounded-2xl bg-rose-500 text-white text-xs font-bold py-3 hover:bg-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.25)] transition-all cursor-pointer">Eliminar</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}