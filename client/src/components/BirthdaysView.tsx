import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  Download,
  Calendar as CalendarIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Cake,
  Gift,
  Check,
  MessageCircle,
  LayoutGrid,
  FileText,
  UserPlus,
  Eye,
  EyeOff,
  Sparkles,
  Quote
} from 'lucide-react';
import api from '../lib/api';
import { LOGO_WHITE_BASE64 } from '../lib/logoWhiteBase64';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface Miembro {
  id: number;
  nombre: string;
  fecha_nacimiento: string;
  congregacion: string;
  bautizado?: boolean;
  confirmado?: boolean;
}

export interface ManualBirthday {
  id: string;
  nombre: string;
  dia: number;
  anioNac?: number;
  congregacion?: string;
  deseo?: string;
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

const DAY_NAMES_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const BIBLE_VERSES = [
  {
    citation: 'Números 6:24-26',
    text: '«El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti y tenga de ti misericordia; el Señor alce sobre ti su rostro y ponga en ti paz.»'
  },
  {
    citation: 'Salmo 139:14',
    text: '«Te alabaré, porque formidables y maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.»'
  },
  {
    citation: 'Jeremías 29:11',
    text: '«Porque yo sé los pensamientos que tengo acerca de vosotros, dice el Señor, pensamientos de paz y no de mal, para daros el fin que esperáis.»'
  },
  {
    citation: 'Salmo 90:12',
    text: '«Enséñanos de tal modo a contar nuestros días, que traigamos al corazón sabiduría.»'
  },
  {
    citation: 'Proverbios 9:11',
    text: '«Porque por mí se aumentarán tus días, y años de vida se te añadirán.»'
  },
  {
    citation: 'Salmo 118:24',
    text: '«Este es el día que hizo el Señor; nos gozaremos y alegraremos en él.»'
  }
];

export default function BirthdaysView() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [timeScope, setTimeScope] = useState<'mes' | 'trimestre' | 'anio'>('mes');
  const [activeTab, setActiveTab] = useState<'fichas' | 'calendario' | 'cartel'>('fichas');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCongregacion, setSelectedCongregacion] = useState<string>('todos');
  const [showAge, setShowAge] = useState<boolean>(true);

  // Cumpleañeros manuales temporales
  const [manualBirthdays, setManualBirthdays] = useState<ManualBirthday[]>([]);
  const [isAddManualOpen, setIsAddManualOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualDay, setManualDay] = useState<number>(1);
  const [manualCongregation, setManualCongregation] = useState<string>('General');

  // Estados de exportación y feedback
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const printableRef = useRef<HTMLDivElement>(null);

  // Consulta de miembros desde la base de datos
  const { data: miembros = [], isLoading } = useQuery<Miembro[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data
  });

  // Conteo de cumpleañeros por cada uno de los 12 meses
  const monthCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    miembros.forEach((m) => {
      if (!m.fecha_nacimiento) return;
      try {
        const parts = m.fecha_nacimiento.split('T')[0].split('-');
        if (parts.length >= 2) {
          const monthIdx = parseInt(parts[1], 10) - 1;
          if (monthIdx >= 0 && monthIdx < 12) counts[monthIdx]++;
        }
      } catch {}
    });
    manualBirthdays.forEach(() => {
      counts[selectedMonth]++;
    });
    return counts;
  }, [miembros, manualBirthdays, selectedMonth]);

  // Procesamiento de los cumpleañeros del mes seleccionado
  const monthBirthdays = useMemo(() => {
    const list: Array<{
      uid: string;
      id: number | string;
      nombre: string;
      dia: number;
      mes: number;
      anioNac?: number;
      edad?: number;
      diaSemana: string;
      congregacion: string;
      esManual: boolean;
      esHoy: boolean;
      esManana: boolean;
      esPasado: boolean;
      diasFaltantes: number;
      statusLabel: string;
      statusType: 'today' | 'tomorrow' | 'upcoming' | 'past' | 'standard';
    }> = [];

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;

    // 1. Miembros registrados
    miembros.forEach((m) => {
      if (!m.fecha_nacimiento) return;
      try {
        const raw = m.fecha_nacimiento.split('T')[0];
        const parts = raw.split('-');
        if (parts.length < 3) return;
        const bYear = parseInt(parts[0], 10);
        const bMonth = parseInt(parts[1], 10) - 1;
        const bDay = parseInt(parts[2], 10);

        // Filtrado según scope (mes, trimestre o año)
        let isInScope = false;
        if (timeScope === 'mes') {
          isInScope = bMonth === selectedMonth;
        } else if (timeScope === 'trimestre') {
          const currentQuarter = Math.floor(selectedMonth / 3);
          const memberQuarter = Math.floor(bMonth / 3);
          isInScope = currentQuarter === memberQuarter;
        } else {
          isInScope = true; // Año completo
        }

        if (isInScope) {
          const targetDate = new Date(selectedYear, bMonth, bDay);
          const dayOfWeek = DAY_NAMES_SHORT[targetDate.getDay()];
          const edad = bYear ? selectedYear - bYear : undefined;

          const esHoy = isCurrentMonth && now.getDate() === bDay;
          const diff = bDay - now.getDate();
          const esManana = isCurrentMonth && diff === 1;
          const esPasado = isCurrentMonth && diff < 0;

          let statusLabel = `${String(bDay).padStart(2, '0')} de ${MONTH_NAMES[bMonth]}`;
          let statusType: 'today' | 'tomorrow' | 'upcoming' | 'past' | 'standard' = 'standard';

          if (isCurrentMonth) {
            if (esHoy) {
              statusLabel = `¡CUMPLE HOY! • ${bDay} de ${MONTH_NAMES[bMonth]}`;
              statusType = 'today';
            } else if (esManana) {
              statusLabel = `Mañana • ${bDay} de ${MONTH_NAMES[bMonth]}`;
              statusType = 'tomorrow';
            } else if (esPasado) {
              statusLabel = `${bDay} de ${MONTH_NAMES[bMonth]} • Pasado`;
              statusType = 'past';
            } else {
              statusLabel = `${bDay} de ${MONTH_NAMES[bMonth]} • En ${diff} días`;
              statusType = 'upcoming';
            }
          }

          list.push({
            uid: `m-${m.id}`,
            id: m.id,
            nombre: m.nombre,
            dia: bDay,
            mes: bMonth,
            anioNac: bYear,
            edad,
            diaSemana: dayOfWeek,
            congregacion: m.congregacion || 'General',
            esManual: false,
            esHoy,
            esManana,
            esPasado,
            diasFaltantes: diff,
            statusLabel,
            statusType
          });
        }
      } catch (err) {
        console.error('Error procesando fecha de miembro', err);
      }
    });

    // 2. Cumpleañeros manuales
    manualBirthdays.forEach((man) => {
      const targetDate = new Date(selectedYear, selectedMonth, man.dia);
      const dayOfWeek = DAY_NAMES_SHORT[targetDate.getDay()];
      const edad = man.anioNac ? selectedYear - man.anioNac : undefined;

      const esHoy = isCurrentMonth && now.getDate() === man.dia;
      const diff = man.dia - now.getDate();
      const esManana = isCurrentMonth && diff === 1;
      const esPasado = isCurrentMonth && diff < 0;

      let statusLabel = `${String(man.dia).padStart(2, '0')} de ${MONTH_NAMES[selectedMonth]}`;
      let statusType: 'today' | 'tomorrow' | 'upcoming' | 'past' | 'standard' = 'standard';

      if (isCurrentMonth) {
        if (esHoy) {
          statusLabel = `¡CUMPLE HOY! • ${man.dia} de ${MONTH_NAMES[selectedMonth]}`;
          statusType = 'today';
        } else if (esManana) {
          statusLabel = `Mañana • ${man.dia} de ${MONTH_NAMES[selectedMonth]}`;
          statusType = 'tomorrow';
        } else if (esPasado) {
          statusLabel = `${man.dia} de ${MONTH_NAMES[selectedMonth]} • Pasado`;
          statusType = 'past';
        } else {
          statusLabel = `${man.dia} de ${MONTH_NAMES[selectedMonth]} • En ${diff} días`;
          statusType = 'upcoming';
        }
      }

      list.push({
        uid: `man-${man.id}`,
        id: man.id,
        nombre: man.nombre,
        dia: man.dia,
        mes: selectedMonth,
        anioNac: man.anioNac,
        edad,
        diaSemana: dayOfWeek,
        congregacion: man.congregacion || 'General',
        esManual: true,
        esHoy,
        esManana,
        esPasado,
        diasFaltantes: diff,
        statusLabel,
        statusType
      });
    });

    // Ordenar cronológicamente por mes y día
    return list.sort((a, b) => {
      if (a.mes !== b.mes) return a.mes - b.mes;
      return a.dia - b.dia;
    });
  }, [miembros, manualBirthdays, selectedMonth, selectedYear, timeScope]);

  // Lista única de congregaciones presentes
  const congregacionesList = useMemo(() => {
    const set = new Set<string>();
    monthBirthdays.forEach((b) => {
      if (b.congregacion) set.add(b.congregacion);
    });
    return Array.from(set);
  }, [monthBirthdays]);

  // Conteo por congregación
  const congregacionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    monthBirthdays.forEach((b) => {
      const c = b.congregacion || 'General';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [monthBirthdays]);

  // Filtrado final por buscador y congregación
  const filteredBirthdays = useMemo(() => {
    return monthBirthdays.filter((b) => {
      const matchesSearch =
        searchTerm.trim() === '' ||
        b.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.congregacion.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCong =
        selectedCongregacion === 'todos' || b.congregacion === selectedCongregacion;

      return matchesSearch && matchesCong;
    });
  }, [monthBirthdays, searchTerm, selectedCongregacion]);

  // Métricas de estado (pasados, hoy, próximos)
  const metrics = useMemo(() => {
    const pasados = filteredBirthdays.filter((b) => b.esPasado).length;
    const hoy = filteredBirthdays.filter((b) => b.esHoy).length;
    const proximos = filteredBirthdays.filter((b) => !b.esPasado && !b.esHoy).length;
    return { pasados, hoy, proximos, total: filteredBirthdays.length };
  }, [filteredBirthdays]);

  // Tarjeta destacada 1: Quien cumple hoy (primer resultado)
  const todayHighlight = useMemo(() => {
    return monthBirthdays.find((b) => b.esHoy) || null;
  }, [monthBirthdays]);

  // Tarjeta destacada 2: Próximo cumpleañero más cercano
  const nextHighlight = useMemo(() => {
    return monthBirthdays.find((b) => !b.esPasado && !b.esHoy) || null;
  }, [monthBirthdays]);

  // Versículo sugerido del mes
  const verseOfTheMonth = useMemo(() => {
    return BIBLE_VERSES[selectedMonth % BIBLE_VERSES.length];
  }, [selectedMonth]);

  // Copiar felicitación para WhatsApp
  const handleCopyGreeting = (name: string, congregacion: string) => {
    const greeting = `¡Feliz cumpleaños, ${name}! 🎂🎉 Que nuestro buen Dios bendiga grandemente tu vida en este nuevo año, guarde tus pasos y derrame Su paz y gozo sobre tu hogar. «El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti...» (Números 6:24). ¡Un abrazo fraternal de parte de tu familia en Cristo de la Iglesia El Buen Pastor (${congregacion})! ✨`;
    navigator.clipboard.writeText(greeting);
    setCopiedToast(`¡Felicitación copiada para ${name}!`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Agregar cumpleañero manual
  const handleAddManualBirthday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim()) return;

    const newManual: ManualBirthday = {
      id: `manual-${Date.now()}`,
      nombre: manualName.trim(),
      dia: Math.min(31, Math.max(1, manualDay)),
      congregacion: manualCongregation.trim() || 'General'
    };

    setManualBirthdays((prev) => [...prev, newManual]);
    setManualName('');
    setManualDay(1);
    setIsAddManualOpen(false);
  };

  // Impresión directa nativa
  const handlePrint = () => {
    window.print();
  };

  // Generador de Canvas para PDF e Imagen
  const generateSheetCanvas = async (element: HTMLElement) => {
    const targetWidth = 816;
    const targetHeight = 1056;

    const helperCanvas = document.createElement('canvas');
    helperCanvas.width = 1;
    helperCanvas.height = 1;
    const helperCtx = helperCanvas.getContext('2d', { willReadFrequently: true });

    const convertSingleColor = (colorStr: string): string => {
      if (!colorStr || colorStr === 'transparent' || colorStr === 'none' || colorStr === 'inherit') {
        return colorStr;
      }
      if (!helperCtx) return '#000000';
      try {
        helperCtx.clearRect(0, 0, 1, 1);
        helperCtx.fillStyle = colorStr;
        helperCtx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = helperCtx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
      } catch {
        return '#000000';
      }
    };

    const toRgba = (val: string): string => {
      if (!val || typeof val !== 'string') return val;
      if (!val.includes('oklch') && !val.includes('oklab') && !val.includes('color-mix')) {
        return val;
      }
      if (val.startsWith('oklch(') || val.startsWith('oklab(') || val.startsWith('color-mix(')) {
        return convertSingleColor(val);
      }
      return val.replace(/oklch\([^)]+\)|oklab\([^)]+\)/g, (match) => convertSingleColor(match));
    };

    const createStyleProxy = (style: CSSStyleDeclaration) => {
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return (propName: string) => {
              const v = target.getPropertyValue(propName);
              return toRgba(v);
            };
          }
          const v = (target as any)[prop];
          if (typeof v === 'string') {
            return toRgba(v);
          }
          if (typeof v === 'function') {
            return v.bind(target);
          }
          return v;
        }
      });
    };

    const origWindowGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
      const style = origWindowGetComputedStyle.call(this, elt, pseudoElt);
      return createStyleProxy(style);
    };

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: '#FFFFFF',
        scrollX: 0,
        scrollY: 0,
        windowWidth: targetWidth + 100,
        windowHeight: targetHeight + 100,
        onclone: (clonedDoc) => {
          const clonedWin = clonedDoc.defaultView;
          if (clonedWin && clonedWin.getComputedStyle) {
            const origClonedGetComputedStyle = clonedWin.getComputedStyle.bind(clonedWin);
            clonedWin.getComputedStyle = function (elt: Element, pseudoElt?: string | null) {
              const style = origClonedGetComputedStyle(elt, pseudoElt);
              return createStyleProxy(style);
            };
          }

          const clonedEl = clonedDoc.getElementById('lienzo-cumpleaneros-imprimible');
          if (clonedEl) {
            clonedEl.style.width = `${targetWidth}px`;
            clonedEl.style.minHeight = `${targetHeight}px`;
            clonedEl.style.maxHeight = `${targetHeight}px`;
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.transform = 'none';
            clonedEl.style.borderRadius = '0px';

            const allCloned = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))] as HTMLElement[];
            allCloned.forEach((node) => {
              if (!node.style) return;
              node.style.filter = 'none';
              (node.style as any).backdropFilter = 'none';
              (node.style as any).webkitBackdropFilter = 'none';
              node.style.boxShadow = 'none';
              node.style.textShadow = 'none';
            });
          }
        }
      });

      return canvas;
    } finally {
      window.getComputedStyle = origWindowGetComputedStyle;
    }
  };

  const handleDownloadPdf = async () => {
    if (!printableRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const canvas = await generateSheetCanvas(printableRef.current);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'letter'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 612, 792, undefined, 'FAST');
      pdf.save(`Cartelera_Cumpleaneros_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Hubo un error al generar el PDF. Por favor utiliza el botón de Imprimir.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-16 font-sans text-slate-900">
      {/* Estilos para impresión en tamaño Carta */}
      <style>{`
        @media print {
          body {
            background: #FFFFFF !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, aside, header, .no-print, [role="navigation"] {
            display: none !important;
          }
          .pantalla-cumpleaneros {
            display: none !important;
          }
          #contenedor-impresion-cumpleaneros {
            display: block !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          #lienzo-cumpleaneros-imprimible {
            width: 100% !important;
            max-width: 100% !important;
            min-height: 100vh !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          @page {
            size: letter portrait;
            margin: 0.25in;
          }
        }
      `}</style>

      {/* Toast flotante */}
      <AnimatePresence>
        {copiedToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border border-slate-700"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{copiedToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pantalla-cumpleaneros space-y-5">
        
        {/* ======================================================== */}
        {/* 1. TOP BAR: BUSCADOR + ALCANCE + ACCIONES               */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nombre o congregación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/80 border border-slate-200/90 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-2xs"
            />
          </div>

          {/* Selector de Alcance (Mes Actual / Trimestre / Año Completo) */}
          <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
            <button
              onClick={() => setTimeScope('mes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeScope === 'mes'
                  ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mes Actual
            </button>
            <button
              onClick={() => setTimeScope('trimestre')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeScope === 'trimestre'
                  ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trimestre
            </button>
            <button
              onClick={() => setTimeScope('anio')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                timeScope === 'anio'
                  ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Año Completo
            </button>
          </div>

          {/* Botones de Acción Superiores */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('cartel');
                setTimeout(() => handlePrint(), 200);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir Reporte</span>
            </button>

            <button
              onClick={() => setIsAddManualOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 text-white text-xs font-black hover:from-rose-600 hover:to-rose-700 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 text-white" />
              <span>+ Añadir Cumpleaños</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. CINTA HORIZONTAL DE MESES CON CONTEOS                */}
        {/* ======================================================== */}
        <div className="bg-white/80 rounded-2xl p-2 border border-slate-200/80 shadow-2xs overflow-x-auto custom-scrollbar flex items-center justify-between gap-1">
          {MONTH_SHORT.map((mShort, idx) => {
            const isSelected = selectedMonth === idx;
            const count = monthCounts[idx];

            if (isSelected) {
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white px-4 py-2 rounded-xl shadow-xs font-black text-xs shrink-0 select-none"
                >
                  <button
                    onClick={() => {
                      if (selectedMonth === 0) {
                        setSelectedMonth(11);
                        setSelectedYear((y) => y - 1);
                      } else setSelectedMonth((m) => m - 1);
                    }}
                    className="hover:opacity-75 cursor-pointer text-white"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span>
                    {MONTH_NAMES[idx]} ({count})
                  </span>
                  <button
                    onClick={() => {
                      if (selectedMonth === 11) {
                        setSelectedMonth(0);
                        setSelectedYear((y) => y + 1);
                      } else setSelectedMonth((m) => m + 1);
                    }}
                    className="hover:opacity-75 cursor-pointer text-white"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            }

            return (
              <button
                key={idx}
                onClick={() => setSelectedMonth(idx)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              >
                {mShort} <span className="text-[11px] font-semibold text-slate-400">({count})</span>
              </button>
            );
          })}
        </div>

        {/* ======================================================== */}
        {/* 3. TRES TARJETAS HERO SUPERIORES (Estilo Stitch Reference)*/}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Celebraciones del Mes */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Celebraciones del Mes
              </span>
              <p className="text-2xl font-black text-slate-900 leading-tight">
                {monthBirthdays.length} {monthBirthdays.length === 1 ? 'cumpleañero' : 'cumpleañeros'}
              </p>
              <p className="text-[11px] font-semibold text-slate-500 mt-1 truncate">
                {congregacionesList.length > 0
                  ? congregacionesList
                      .slice(0, 3)
                      .map((c) => `${congregacionCounts[c] || 0} en ${c}`)
                      .join(' • ')
                  : 'Sin registros para este mes'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0">
              <Cake className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: ¡HOY ES SU DÍA! (Spotlight Card) */}
          <div
            className={`rounded-3xl p-5 border shadow-2xs flex items-center justify-between gap-4 transition-all ${
              todayHighlight
                ? 'bg-rose-50/50 border-rose-200 ring-2 ring-rose-400/20'
                : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="min-w-0">
              <span
                className={`inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5 ${
                  todayHighlight
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <PartyPopper className="w-3 h-3" />
                <span>{todayHighlight ? '¡HOY ES SU DÍA!' : 'HOY'}</span>
              </span>

              {todayHighlight ? (
                <>
                  <h4 className="text-base font-black text-slate-900 truncate leading-tight">
                    {todayHighlight.nombre}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                    {showAge && todayHighlight.edad ? `Cumple ${todayHighlight.edad} años • ` : ''}
                    {todayHighlight.congregacion}
                  </p>
                </>
              ) : (
                <>
                  <h4 className="text-sm font-bold text-slate-700">Ningún cumpleaños hoy</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Revisa los próximos días en la lista.
                  </p>
                </>
              )}
            </div>

            {todayHighlight ? (
              <div className="text-center shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center shadow-xs mx-auto">
                  {todayHighlight.dia}
                </div>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">
                  {MONTH_SHORT[selectedMonth]}
                </span>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Card 3: Próximo Cumpleaños */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex items-center justify-between gap-4">
            <div className="min-w-0">
              {nextHighlight ? (
                <>
                  <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5">
                    {nextHighlight.esManana
                      ? `Mañana • ${nextHighlight.dia} de ${MONTH_SHORT[selectedMonth]}`
                      : `${nextHighlight.dia} de ${MONTH_SHORT[selectedMonth]} • En ${nextHighlight.diasFaltantes} días`}
                  </span>
                  <h4 className="text-base font-black text-slate-900 truncate leading-tight">
                    {nextHighlight.nombre}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5 truncate">
                    {showAge && nextHighlight.edad ? `Cumple ${nextHighlight.edad} años • ` : ''}
                    {nextHighlight.congregacion}
                  </p>
                </>
              ) : (
                <>
                  <span className="inline-block bg-slate-100 text-slate-400 text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md mb-1.5">
                    Próximos
                  </span>
                  <h4 className="text-sm font-bold text-slate-700">Sin próximos este mes</h4>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Todos los del mes ya pasaron.
                  </p>
                </>
              )}
            </div>

            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. BARRA DE FILTRADO POR CONGREGACIÓN Y VISTAS          */}
        {/* ======================================================== */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Pills de Filtrado por Congregación */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-400 shrink-0 mr-1">Filtrar por:</span>
            <button
              onClick={() => setSelectedCongregacion('todos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCongregacion === 'todos'
                  ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                  : 'bg-white/80 text-slate-600 hover:bg-white'
              }`}
            >
              Todos ({monthBirthdays.length})
            </button>

            {congregacionesList.map((cong) => (
              <button
                key={cong}
                onClick={() => setSelectedCongregacion(cong)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCongregacion === cong
                    ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                    : 'bg-white/80 text-slate-600 hover:bg-white'
                }`}
              >
                {cong} ({congregacionCounts[cong] || 0})
              </button>
            ))}
          </div>

          {/* Switcher de Vistas: Fichas | Calendario | Cartel para Impresión */}
          <div className="flex items-center gap-1 bg-white/80 p-1 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto shrink-0">
            <button
              onClick={() => setActiveTab('fichas')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'fichas'
                  ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Fichas</span>
            </button>

            <button
              onClick={() => setActiveTab('calendario')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'calendario'
                  ? 'bg-slate-900 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>

            <button
              onClick={() => setActiveTab('cartel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cartel'
                  ? 'bg-rose-500 text-white shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cartel para Impresión</span>
            </button>
          </div>
        </div>

        {/* Encabezado de la lista con métricas */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <h2 className="text-lg font-black text-slate-900">
              Cumpleañeros de {MONTH_NAMES[selectedMonth]}
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 block">
              Ordenados cronológicamente del día 1 al 31
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-slate-500">
              {metrics.pasados} pasados • {metrics.hoy} hoy • {metrics.proximos} próximos
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. VISTA 1: FICHAS (Tarjetas Modernas del Mockup)       */}
        {/* ======================================================== */}
        {activeTab === 'fichas' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Cargando directorio de cumpleañeros...</p>
              </div>
            ) : filteredBirthdays.length === 0 ? (
              <div className="py-20 text-center rounded-3xl bg-white/70 border border-dashed border-slate-300 p-8">
                <Cake className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No se encontraron cumpleañeros</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchTerm ? 'Intenta con otro término de búsqueda.' : 'Puedes agregar miembros o registrar uno adicional.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {filteredBirthdays.map((b) => (
                  <motion.div
                    key={b.uid}
                    whileHover={{ y: -2 }}
                    className={`bg-white rounded-3xl p-4 border transition-all flex flex-col justify-between ${
                      b.esHoy
                        ? 'border-rose-400 shadow-md ring-2 ring-rose-400/20'
                        : 'border-slate-200/90 shadow-2xs hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Fila superior: badge de fecha + edad */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md truncate ${
                            b.esHoy
                              ? 'bg-rose-500 text-white font-black'
                              : b.esManana
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : b.esPasado
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}
                        >
                          {b.statusLabel}
                        </span>

                        {showAge && b.edad !== undefined && (
                          <span className="text-[11px] font-extrabold text-slate-400 shrink-0">
                            {b.esPasado ? `Cumplió ${b.edad}` : `Cumple ${b.edad}`}
                          </span>
                        )}
                      </div>

                      {/* Info del Miembro: Avatar + Nombre + Congregación */}
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                            b.esHoy
                              ? 'bg-rose-500 text-white'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          {b.nombre.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                            {b.nombre}
                          </h4>
                          <p className="text-[11px] font-medium text-slate-500 truncate mt-0.5">
                            {b.congregacion}
                          </p>
                        </div>
                      </div>

                      {/* Nota o sugerencia bíblica */}
                      <div className="bg-slate-50 rounded-xl p-2.5 mb-3 border border-slate-100 text-[10.5px] text-slate-600 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">
                          {b.esHoy ? '¡Día de gozo y gratitud en Cristo!' : `Día de la semana: ${b.diaSemana}`}
                        </span>
                      </div>
                    </div>

                    {/* Botón de Acción en la base de la tarjeta */}
                    {b.esHoy ? (
                      <button
                        onClick={() => handleCopyGreeting(b.nombre, b.congregacion)}
                        className="w-full py-2 rounded-xl bg-rose-500 text-white text-xs font-black hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <PartyPopper className="w-3.5 h-3.5" />
                        <span>Felicitar Ahora</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCopyGreeting(b.nombre, b.congregacion)}
                        className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Copiar mensaje de felicitación para WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar Mensaje</span>
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 6. VISTA 2: CALENDARIO MENSUAL (Vista Almanaque)        */}
        {/* ======================================================== */}
        {activeTab === 'calendario' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-7 gap-2 text-center mb-3">
              {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map((d) => (
                <span key={d} className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[85px] rounded-2xl bg-slate-50/50" />
              ))}

              {Array.from({ length: new Date(selectedYear, selectedMonth + 1, 0).getDate() }).map((_, i) => {
                const dayNum = i + 1;
                const bdaysOnDay = filteredBirthdays.filter((b) => b.dia === dayNum);
                const hasBdays = bdaysOnDay.length > 0;

                return (
                  <div
                    key={`day-${dayNum}`}
                    className={`min-h-[85px] rounded-2xl p-2 border transition-all flex flex-col justify-between ${
                      hasBdays
                        ? 'bg-rose-50/40 border-rose-200 shadow-2xs'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <span
                      className={`text-xs font-black self-start ${
                        hasBdays ? 'text-rose-600 font-black' : 'text-slate-500'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {hasBdays && (
                      <div className="space-y-1">
                        {bdaysOnDay.slice(0, 2).map((b) => (
                          <div
                            key={b.uid}
                            className="text-[9.5px] font-bold bg-white text-slate-800 px-1.5 py-0.5 rounded-md border border-rose-200 truncate shadow-2xs"
                            title={b.nombre}
                          >
                            🎉 {b.nombre}
                          </div>
                        ))}
                        {bdaysOnDay.length > 2 && (
                          <span className="text-[9px] font-bold text-rose-600 block text-right">
                            +{bdaysOnDay.length - 2} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 7. VISTA 3: CARTEL PARA IMPRESIÓN (PIZARRA MURAL)       */}
        {/* ======================================================== */}
        <div className={activeTab === 'cartel' ? 'block' : 'hidden'}>
          {/* Barra de control de la cartelera */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Vista Previa para Cartelera de la Iglesia
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Diseño optimizado para impresión en tamaño Carta para la pizarra física de la congregación.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAge(!showAge)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 cursor-pointer flex items-center gap-1.5"
              >
                {showAge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{showAge ? 'Ocultar Edad' : 'Mostrar Edad'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Cartelera del Mes</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGenerating ? 'Generando...' : 'Descargar PDF'}</span>
              </button>
            </div>
          </div>

          {/* Lienzo Imprimible Tamaño Carta */}
          <div id="contenedor-impresion-cumpleaneros" className="flex justify-center overflow-x-auto pb-8">
            <div
              ref={printableRef}
              id="lienzo-cumpleaneros-imprimible"
              style={{
                width: '816px',
                minHeight: '1056px',
                backgroundColor: '#FFFFFF'
              }}
              className="relative shadow-xl overflow-hidden flex flex-col justify-between p-10 border border-slate-200"
            >
              {/* Parte Superior: Encabezado + Versículo */}
              <div className="space-y-6">
                
                {/* Header Institucional con Logo */}
                <div className="flex items-center justify-between pb-6 border-b-2 border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 p-2 flex items-center justify-center shrink-0 shadow-sm">
                      <img
                        src={LOGO_WHITE_BASE64}
                        alt="Logo ICLEB"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                        Iglesia Cristiana Luterana El Buen Pastor
                      </span>
                      <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase mt-0.5">
                        Cumpleañeros de {MONTH_NAMES[selectedMonth]} {selectedYear}
                      </h1>
                      <span className="text-xs font-bold text-rose-600 block mt-0.5">
                        Directorio de Celebración de Vida • {filteredBirthdays.length} celebraciones
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-black uppercase tracking-wider">
                      {MONTH_NAMES[selectedMonth]} {selectedYear}
                    </span>
                  </div>
                </div>

                {/* Versículo Bíblico del Mes */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex items-start gap-3">
                  <Quote className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs leading-relaxed italic text-slate-800 font-medium">
                      {verseOfTheMonth.text}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 mt-1">
                      — {verseOfTheMonth.citation}
                    </p>
                  </div>
                </div>

                {/* Grid de Fichas para la Pizarra */}
                {filteredBirthdays.length === 0 ? (
                  <div className="py-24 text-center rounded-2xl border border-dashed border-slate-200">
                    <Cake className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">
                      Sin cumpleaños registrados en este periodo.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredBirthdays.map((b) => (
                      <div
                        key={b.uid}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Badge de Día */}
                          <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center shrink-0">
                            <span className="text-sm font-black leading-none">{b.dia}</span>
                            <span className="text-[7.5px] font-black uppercase tracking-wider mt-0.5 opacity-80 leading-none">
                              {b.diaSemana}
                            </span>
                          </div>

                          {/* Nombre y Congregación */}
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 truncate leading-tight">
                              {b.nombre}
                            </h4>
                            <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                              {b.congregacion}
                            </p>
                          </div>
                        </div>

                        {showAge && b.edad !== undefined && (
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                            {b.edad} años
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pie de Página de la Cartelera */}
              <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
                  Pizarra Informativa ICLEB • «Dando gracias al Señor en todo tiempo»
                </span>
                <span>
                  Emitido: {MONTH_NAMES[selectedMonth]} {selectedYear}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para Agregar Cumpleañero Adicional */}
      {isAddManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Añadir Cumpleañero Adicional
              </h3>
              <button
                onClick={() => setIsAddManualOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualBirthday} className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pastor Juan Pérez..."
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Día de {MONTH_NAMES[selectedMonth]}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={manualDay}
                    onChange={(e) => setManualDay(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Congregación
                  </label>
                  <input
                    type="text"
                    value={manualCongregation}
                    onChange={(e) => setManualCongregation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddManualOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer shadow-xs"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
