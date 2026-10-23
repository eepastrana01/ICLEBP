import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Calendar,
  Wallet,
  Cake,
  ArrowRight,
  Ticket,
  MessageCircle,
  Check,
  ChevronRight
} from 'lucide-react';
import api from '../lib/api';

export interface Miembro {
  id: number;
  nombre: string;
  fecha_nacimiento: string;
  congregacion: string;
  bautizado?: boolean;
  confirmado?: boolean;
}

export interface Actividad {
  id: number;
  fecha: string;
  actividad: string;
  detalles?: string;
  categoria?: string;
  completado: boolean;
}

export interface Transaccion {
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

export interface Evento {
  id: number;
  nombre: string;
  tipo: string;
  meta_recaudacion?: number | null;
  precio_boleto: number;
  activo: boolean;
  resumen?: {
    total_participantes: number;
    total_recaudado: number;
    total_pendiente: number;
    porcentaje_recaudado: number;
  };
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_FULL = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

export default function HomeDashboardView() {
  const navigate = useNavigate();
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const now = new Date();
  const currMonth = now.getMonth();
  const currYear = now.getFullYear();
  const todayDay = now.getDate();

  const fechaHoyFormateada = useMemo(() => {
    const diaNombre = DAY_NAMES_FULL[now.getDay()];
    const mesNombre = MONTH_NAMES[currMonth].toLowerCase();
    return `${diaNombre}, ${todayDay} de ${mesNombre} de ${currYear}`;
  }, [now, currMonth, todayDay, currYear]);

  // ==================== QUERIES ====================
  const { data: miembros = [], isLoading: loadingMiembros } = useQuery<Miembro[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data
  });

  const { data: actividades = [], isLoading: loadingActividades } = useQuery<Actividad[]>({
    queryKey: ['actividades'],
    queryFn: async () => (await api.get('/actividades')).data
  });

  const { data: finanzasData, isLoading: loadingFinanzas } = useQuery({
    queryKey: ['finanzas'],
    queryFn: async () => (await api.get('/finanzas/datos')).data
  });

  const { data: eventos = [] } = useQuery<Evento[]>({
    queryKey: ['eventos'],
    queryFn: async () => (await api.get('/eventos')).data
  });

  const transacciones: Transaccion[] = finanzasData?.transacciones || [];

  // ==================== CÁLCULOS: MEMBRESÍA ====================
  const { totalMiembros, bautizadosCount, confirmadosCount, pctBautizados, pctConfirmados } = useMemo(() => {
    const total = miembros.length;
    const bautizados = miembros.filter((m) => m.bautizado).length;
    const confirmados = miembros.filter((m) => m.confirmado).length;
    return {
      totalMiembros: total,
      bautizadosCount: bautizados,
      confirmadosCount: confirmados,
      pctBautizados: total > 0 ? Math.round((bautizados / total) * 100) : 0,
      pctConfirmados: total > 0 ? Math.round((confirmados / total) * 100) : 0
    };
  }, [miembros]);

  // ==================== CÁLCULOS: FINANZAS ====================
  const { ingresosMes, egresosMes, balanceMes, saldoTotal, ultimoCultoAsistencia } = useMemo<{
    ingresosMes: number;
    egresosMes: number;
    balanceMes: number;
    saldoTotal: number;
    ultimoCultoAsistencia: { fecha: string; asistentes: number; comulgantes: number; monto: number } | null;
  }>(() => {
    let saldo = 0;
    let ingMes = 0;
    let egMes = 0;
    let ultCulto: { fecha: string; asistentes: number; comulgantes: number; monto: number } | null = null;

    transacciones.forEach((tx) => {
      const txDate = new Date(tx.fecha);
      const local = new Date(txDate.getTime() + txDate.getTimezoneOffset() * 60000);
      const isCurr = local.getMonth() === currMonth && local.getFullYear() === currYear;

      if (tx.tipo === 'ingreso') {
        saldo += tx.monto;
        if (isCurr) ingMes += tx.monto;

        if (tx.asistentes && tx.asistentes > 0) {
          if (!ultCulto || new Date(tx.fecha) > new Date(ultCulto.fecha)) {
            ultCulto = {
              fecha: tx.fecha,
              asistentes: tx.asistentes,
              comulgantes: tx.comulgantes || 0,
              monto: tx.monto
            };
          }
        }
      } else {
        saldo -= tx.monto;
        if (isCurr) egMes += tx.monto;
      }
    });

    return {
      ingresosMes: ingMes,
      egresosMes: egMes,
      balanceMes: ingMes - egMes,
      saldoTotal: saldo,
      ultimoCultoAsistencia: ultCulto
    };
  }, [transacciones, currMonth, currYear]);

  // ==================== CÁLCULOS: AGENDA ====================
  const { actividadesMes, completadasMes, pendientesMes, pctAgendaMes, proximasActividades } = useMemo(() => {
    const mesActs: Actividad[] = [];
    const futuras: Actividad[] = [];
    const hoyTimestamp = new Date(currYear, currMonth, todayDay).getTime();

    actividades.forEach((act) => {
      if (!act.fecha) return;
      const d = new Date(act.fecha);
      const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);

      if (local.getFullYear() === currYear && local.getMonth() === currMonth) {
        mesActs.push(act);
      }

      const actTimestamp = new Date(local.getFullYear(), local.getMonth(), local.getDate()).getTime();
      if (actTimestamp >= hoyTimestamp && !act.completado) {
        futuras.push(act);
      }
    });

    futuras.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const totalMes = mesActs.length;
    const compl = mesActs.filter((a) => a.completado).length;
    const pend = totalMes - compl;
    const pct = totalMes > 0 ? Math.round((compl / totalMes) * 100) : 0;

    return {
      actividadesMes: totalMes,
      completadasMes: compl,
      pendientesMes: pend,
      pctAgendaMes: pct,
      proximasActividades: futuras.slice(0, 4)
    };
  }, [actividades, currMonth, currYear, todayDay]);

  // ==================== CÁLCULOS: CUMPLEAÑOS ====================
  const { cumpleanerosMesTotal, cumpleanerosEstaSemana, cumpleHoyCount } = useMemo(() => {
    let mesTotal = 0;
    let hoyCount = 0;
    const semana: Array<{
      id: number;
      nombre: string;
      dia: number;
      congregacion: string;
      diffDias: number;
      esHoy: boolean;
      edad?: number;
    }> = [];

    miembros.forEach((m) => {
      if (!m.fecha_nacimiento) return;
      try {
        const parts = m.fecha_nacimiento.split('T')[0].split('-');
        if (parts.length < 3) return;
        const bYear = parseInt(parts[0], 10);
        const bMonth = parseInt(parts[1], 10) - 1;
        const bDay = parseInt(parts[2], 10);

        if (bMonth === currMonth) {
          mesTotal++;
          const diff = bDay - todayDay;
          const esHoy = diff === 0;

          if (esHoy) hoyCount++;

          if (diff >= 0 && diff <= 7) {
            semana.push({
              id: m.id,
              nombre: m.nombre,
              dia: bDay,
              congregacion: m.congregacion || 'General',
              diffDias: diff,
              esHoy,
              edad: bYear ? currYear - bYear : undefined
            });
          }
        }
      } catch {}
    });

    semana.sort((a, b) => a.dia - b.dia);

    return {
      cumpleanerosMesTotal: mesTotal,
      cumpleanerosEstaSemana: semana,
      cumpleHoyCount: hoyCount
    };
  }, [miembros, currMonth, currYear, todayDay]);

  // Evento activo para rifas
  const eventoActivo = useMemo(() => {
    return eventos.find((e) => e.activo) || eventos[0] || null;
  }, [eventos]);

  // Copiar felicitación (sin lecturas bíblicas, respetando la instrucción del usuario)
  const handleCopyCongratulation = (nombre: string, congregacion: string) => {
    const mensaje = `¡Hola ${nombre}! De parte de toda la comunidad de la Iglesia El Buen Pastor (${congregacion}), te deseamos un muy feliz cumpleaños. Que pases un día lleno de salud, alegría y bendición junto a tus seres queridos. ¡Un fuerte abrazo!`;
    navigator.clipboard.writeText(mensaje);
    setCopiedToast(`Saludo copiado para ${nombre}`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  return (
    <div className="min-h-full font-sans text-slate-900 space-y-6 pb-12">
      
      {/* Toast Flotante */}
      {copiedToast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-slate-700 animate-in fade-in duration-150">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. CABECERA LIMPIA (Idéntica al estilo de Finanzas)     */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-slate-200/80 shadow-2xs mb-2 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              Panel Pastoral &bull; El Buen Pastor
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Resumen General
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            {fechaHoyFormateada}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => navigate('/agenda')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200/80 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Agenda</span>
          </button>
          <button
            onClick={() => navigate('/finanzas')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-[0_4px_14px_rgba(15,23,42,0.18)] transition-colors cursor-pointer"
          >
            <Wallet className="w-4 h-4 text-white" />
            <span>Finanzas</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TARJETAS DE ESTADO PRINCIPAL (4 KPIS OPERATIVOS)      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Finanzas del Mes */}
        <div
          onClick={() => navigate('/finanzas')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Finanzas del Mes
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <p className={`text-2xl font-black tracking-tight ${balanceMes >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
              {loadingFinanzas ? '...' : `L. ${balanceMes.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Saldo total: L. {saldoTotal.toLocaleString('es-HN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-100/80">
              <span className="text-[10px] font-bold text-emerald-800 block">Ingresos</span>
              <span className="font-black text-emerald-900 block truncate">
                L. {ingresosMes.toLocaleString('es-HN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="bg-rose-50/60 p-2 rounded-xl border border-rose-100/80">
              <span className="text-[10px] font-bold text-rose-800 block">Egresos</span>
              <span className="font-black text-rose-900 block truncate">
                L. {egresosMes.toLocaleString('es-HN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: Agenda de Actividades */}
        <div
          onClick={() => navigate('/agenda')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Agenda de {MONTH_NAMES[currMonth]}
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>

            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {loadingActividades ? '...' : actividadesMes}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Actividades programadas
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Completadas: {completadasMes} de {actividadesMes}</span>
              <span className="text-blue-600">{pctAgendaMes}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${pctAgendaMes}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>{pendientesMes} pendientes</span>
              <span className="text-blue-700 font-bold flex items-center gap-0.5">
                Ver Agenda <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Membresía */}
        <div
          onClick={() => navigate('/miembros')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Directorio de Miembros
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {loadingMiembros ? '...' : totalMiembros}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Hermanos registrados
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Bautizados: {bautizadosCount}</span>
              <span className="text-indigo-600">{pctBautizados}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${pctBautizados}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
              <span>Confirmados: {confirmadosCount} ({pctConfirmados}%)</span>
              <span className="text-indigo-700 font-bold flex items-center gap-0.5">
                Ver Lista <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Cumpleaños del Mes */}
        <div
          onClick={() => navigate('/cumpleaneros')}
          className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Cumpleaños de {MONTH_NAMES[currMonth]}
              </span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Cake className="w-4 h-4" />
              </div>
            </div>

            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {cumpleanerosMesTotal}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Celebraciones en el mes
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100">
            {cumpleHoyCount > 0 ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-xl text-center">
                <span className="text-[11px] font-black block">¡{cumpleHoyCount} cumpleaños hoy!</span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 py-1">
                <span>Esta semana: {cumpleanerosEstaSemana.length}</span>
                <span className="text-rose-600 font-bold flex items-center gap-0.5">
                  Ver Cartelera <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. DOS COLUMNAS: ACTIVIDADES PRÓXIMAS & CUMPLEAÑOS       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Columna Izquierda: Próximas Actividades */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Próximas Actividades
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Cronograma inmediato de la congregación
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/agenda')}
                className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {proximasActividades.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No hay actividades próximas pendientes</p>
                <button
                  onClick={() => navigate('/agenda')}
                  className="mt-2 text-xs font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  + Programar actividad en Agenda
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {proximasActividades.map((act) => {
                  const d = new Date(act.fecha);
                  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
                  const dia = local.getDate();
                  const mes = MONTH_NAMES[local.getMonth()].substring(0, 3);
                  const diaSem = DAY_NAMES_FULL[local.getDay()].substring(0, 3).toUpperCase();

                  return (
                    <div
                      key={act.id}
                      onClick={() => navigate('/agenda')}
                      className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                          <span className="text-sm font-black leading-none">{dia}</span>
                          <span className="text-[8px] font-extrabold uppercase mt-0.5 opacity-80 leading-none">
                            {mes}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 truncate leading-snug">
                            {act.actividad}
                          </h4>
                          <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
                            {diaSem} • {act.categoria || 'Actividad General'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Pendiente
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cartelera mural del mes para imprimir</span>
            <button
              onClick={() => navigate('/cartelera')}
              className="font-bold text-slate-900 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ir a Cartelera</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Columna Derecha: Cumpleaños de Esta Semana */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Cake className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Cumpleañeros de la Semana
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Celebraciones en los próximos 7 días
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigate('/cumpleaneros')}
                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Todos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {cumpleanerosEstaSemana.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Cake className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No hay cumpleaños en los próximos 7 días</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Revisa los {cumpleanerosMesTotal} cumpleañeros del mes en el directorio.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cumpleanerosEstaSemana.map((c) => (
                  <div
                    key={c.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                      c.esHoy
                        ? 'bg-rose-50/60 border-rose-200'
                        : 'bg-slate-50 border-slate-200/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                          c.esHoy ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'
                        }`}
                      >
                        {c.dia}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-900 truncate leading-snug">
                            {c.nombre}
                          </h4>
                          {c.esHoy && (
                            <span className="text-[9px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded uppercase">
                              ¡Hoy!
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">
                          {c.congregacion} • {c.diffDias === 0 ? 'Hoy' : c.diffDias === 1 ? 'Mañana' : `En ${c.diffDias} días`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyCongratulation(c.nombre, c.congregacion)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-emerald-700 hover:border-emerald-300 transition-colors cursor-pointer shadow-2xs shrink-0"
                      title="Copiar felicitación para WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Saludar</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Directorio e impresión mensual de cumpleaños</span>
            <button
              onClick={() => navigate('/cumpleaneros')}
              className="font-bold text-slate-900 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Módulo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. SECCIÓN INFERIOR: RESUMEN DE CULTOS Y EVENTOS         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Asistencia de Culto Dominical */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Último Registro de Culto Dominical
              </span>
              <p className="text-base font-black text-slate-900 truncate mt-0.5">
                {ultimoCultoAsistencia
                  ? `${ultimoCultoAsistencia.asistentes} asistentes • ${ultimoCultoAsistencia.comulgantes} comulgantes`
                  : 'Sin registros de culto este mes'}
              </p>
              {ultimoCultoAsistencia && (
                <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                  Ofrenda registrada: L. {ultimoCultoAsistencia.monto.toLocaleString('es-HN', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/finanzas')}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shrink-0 cursor-pointer"
          >
            Ver Finanzas
          </button>
        </div>

        {/* Rifas y Eventos Especiales */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Ticket className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Actividades Pro-Fondos & Rifas
              </span>
              <p className="text-base font-black text-slate-900 truncate mt-0.5">
                {eventoActivo ? eventoActivo.nombre : 'No hay rifas activas'}
              </p>
              {eventoActivo && eventoActivo.resumen && (
                <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
                  L. {eventoActivo.resumen.total_recaudado.toLocaleString('es-HN')} recaudados ({eventoActivo.resumen.porcentaje_recaudado}%)
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/eventos')}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200 shrink-0 cursor-pointer"
          >
            Ver Eventos
          </button>
        </div>

      </div>

    </div>
  );
}
