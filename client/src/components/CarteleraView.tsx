import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Download,
  Image as ImageIcon,
  Sparkles,
  Calendar,
  Layers,
  Palette,
  Quote,
  Check,
  MapPin,
  Clock,
  Church,
  Ticket,
  PartyPopper,
  Users,
  Wrench,
  Tag,
  AlertCircle
} from 'lucide-react';
import api from '../lib/api';
import { LOGO_WHITE_BASE64 } from '../lib/logoWhiteBase64';
import { detectCategoryFromTitle, type Actividad } from './ActivityModal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

interface ThemeOption {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  headerBgStyle: { background: string };
  headerBg: string;
  headerText: string;
  paperBgStyle: { backgroundColor: string };
  paperBg: string;
  cardBgStyle: { backgroundColor: string; borderColor: string };
  cardBg: string;
  cardBorder: string;
  dayBadgeBgStyle: { backgroundColor: string; color: string };
  dayBadgeBg: string;
  dayBadgeText: string;
  titleColor: string;
  mutedColor: string;
  verseBgStyle: { backgroundColor: string; borderColor: string; color: string };
  verseBg: string;
  verseBorder: string;
  verseText: string;
  tagDot: string;
}

const THEMES: Record<string, ThemeOption> = {
  navy: {
    id: 'navy',
    name: 'Azul Clásico',
    tagline: 'Institucional & Sobrio',
    accentColor: '#1E3A8A',
    headerBgStyle: { background: 'linear-gradient(to right, #090d16, #172554, #090d16)' },
    headerBg: 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900',
    headerText: 'text-white',
    paperBgStyle: { backgroundColor: '#F8FAFC' },
    paperBg: 'bg-[#F8FAFC]',
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    dayBadgeBgStyle: { backgroundColor: '#1E3A8A', color: '#FFFFFF' },
    dayBadgeBg: 'bg-blue-900 text-white',
    dayBadgeText: 'text-blue-900',
    titleColor: 'text-slate-900',
    mutedColor: 'text-slate-600',
    verseBgStyle: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#172554' },
    verseBg: 'bg-blue-50',
    verseBorder: 'border-blue-200',
    verseText: 'text-blue-950',
    tagDot: 'bg-blue-700'
  },
  sage: {
    id: 'sage',
    name: 'Salvia & Menta',
    tagline: 'Natural & Pacífico',
    accentColor: '#2D6A4F',
    headerBgStyle: { background: 'linear-gradient(to right, #022c22, #042f2e, #022c22)' },
    headerBg: 'bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-950',
    headerText: 'text-white',
    paperBgStyle: { backgroundColor: '#F4F7F5' },
    paperBg: 'bg-[#F4F7F5]',
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#D1FAE5' },
    cardBg: 'bg-white',
    cardBorder: 'border-emerald-200',
    dayBadgeBgStyle: { backgroundColor: '#065F46', color: '#FFFFFF' },
    dayBadgeBg: 'bg-emerald-800 text-white',
    dayBadgeText: 'text-emerald-800',
    titleColor: 'text-emerald-950',
    mutedColor: 'text-emerald-800',
    verseBgStyle: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#064E3B' },
    verseBg: 'bg-emerald-50',
    verseBorder: 'border-emerald-200',
    verseText: 'text-emerald-950',
    tagDot: 'bg-emerald-600'
  },
  terracotta: {
    id: 'terracotta',
    name: 'Terracota',
    tagline: 'Cálido & Reforma',
    accentColor: '#9C4221',
    headerBgStyle: { background: 'linear-gradient(to right, #451a03, #7c2d12, #451a03)' },
    headerBg: 'bg-gradient-to-r from-[#5E2211] via-[#7A2E16] to-[#5E2211]',
    headerText: 'text-white',
    paperBgStyle: { backgroundColor: '#FAF6F2' },
    paperBg: 'bg-[#FAF6F2]',
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#FDE68A' },
    cardBg: 'bg-white',
    cardBorder: 'border-amber-200',
    dayBadgeBgStyle: { backgroundColor: '#9C4221', color: '#FFFFFF' },
    dayBadgeBg: 'bg-[#9C4221] text-white',
    dayBadgeText: 'text-[#9C4221]',
    titleColor: 'text-stone-900',
    mutedColor: 'text-stone-600',
    verseBgStyle: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A', color: '#78350F' },
    verseBg: 'bg-amber-50',
    verseBorder: 'border-amber-200',
    verseText: 'text-[#7A2E16]',
    tagDot: 'bg-[#9C4221]'
  },
  burgundy: {
    id: 'burgundy',
    name: 'Borgoña Real',
    tagline: 'Festivo & Distinguido',
    accentColor: '#831843',
    headerBgStyle: { background: 'linear-gradient(to right, #4c0519, #3b0764, #4c0519)' },
    headerBg: 'bg-gradient-to-r from-rose-950 via-purple-950 to-rose-950',
    headerText: 'text-white',
    paperBgStyle: { backgroundColor: '#FCF8F9' },
    paperBg: 'bg-[#FCF8F9]',
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#FECDD3' },
    cardBg: 'bg-white',
    cardBorder: 'border-rose-200',
    dayBadgeBgStyle: { backgroundColor: '#831843', color: '#FFFFFF' },
    dayBadgeBg: 'bg-[#831843] text-white',
    dayBadgeText: 'text-[#831843]',
    titleColor: 'text-slate-900',
    mutedColor: 'text-slate-600',
    verseBgStyle: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', color: '#881337' },
    verseBg: 'bg-rose-50',
    verseBorder: 'border-rose-200',
    verseText: 'text-[#831843]',
    tagDot: 'bg-[#831843]'
  }
};

const VERSE_SUGGESTIONS = [
  '«El Señor es mi pastor; nada me faltará.» — Salmo 23:1',
  '«Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.» — Efesios 2:8',
  '«Mirad cuán bueno y cuán delicioso es habitar los hermanos juntos en armonía.» — Salmo 133:1',
  '«Consagraos hoy al Señor para que él os dé hoy su bendición.» — Éxodo 32:29',
  '«Yo y mi casa serviremos al Señor.» — Josué 24:15',
  '«Todo lo que hagáis, hacedlo de corazón, como para el Señor y no para los hombres.» — Colosenses 3:23'
];

function getCategoryIcon(catId: string) {
  switch (catId) {
    case 'mantenimiento': return Wrench;
    case 'recaudacion': return Ticket;
    case 'celebracion': return PartyPopper;
    case 'reunion': return Users;
    case 'culto': return Church;
    default: return Tag;
  }
}

export default function CarteleraView() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [themeKey, setThemeKey] = useState<string>('navy');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [verseText, setVerseText] = useState<string>(
    '«El Señor es mi pastor; nada me faltará.» — Salmo 23:1'
  );
  const [exportingType, setExportingType] = useState<'pdf' | 'image' | null>(null);

  const printSheetRef = useRef<HTMLDivElement>(null);

  // Cargar actividades desde la API
  const { data: actividades = [], isLoading } = useQuery<Actividad[]>({
    queryKey: ['actividades'],
    queryFn: async () => {
      const res = await api.get('/actividades');
      return res.data;
    }
  });

  // Filtrar actividades del mes seleccionado
  const monthActivities = useMemo(() => {
    return actividades.filter((a) => {
      if (!a.fecha) return false;
      const f = new Date(a.fecha);
      const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
      return local.getMonth() === selectedMonth && local.getFullYear() === selectedYear;
    }).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }, [actividades, selectedMonth, selectedYear]);

  // Inicializar selección con todas las del mes
  React.useEffect(() => {
    setSelectedIds(monthActivities.map(a => a.id));
  }, [monthActivities]);

  // Actividades elegidas para la cartelera
  const displayedActivities = useMemo(() => {
    return monthActivities.filter(a => selectedIds.includes(a.id));
  }, [monthActivities, selectedIds]);

  const theme = THEMES[themeKey] || THEMES.navy;

  const toggleSelectId = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(monthActivities.map(a => a.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // 1. Impresión directa nativa
  const handlePrint = () => {
    window.print();
  };

  // Helper para generar el canvas de la cartelera con sanitización total de estilos
  const generateSheetCanvas = async (element: HTMLElement) => {
    const isLandscape = orientation === 'landscape';
    const targetWidth = isLandscape ? 1056 : 816;
    const targetHeight = isLandscape ? 816 : 1056;

    // Canvas 1x1 auxiliar para transformar colores modernos (oklab, oklch, color-mix) a rgba nativo
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

    // Interceptar getComputedStyle en el window principal mientras corre html2canvas
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

          const clonedEl = clonedDoc.getElementById('lienzo-cartelera-imprimible');
          if (clonedEl) {
            clonedEl.style.width = `${targetWidth}px`;
            clonedEl.style.minHeight = `${targetHeight}px`;
            clonedEl.style.maxHeight = `${targetHeight}px`;
            clonedEl.style.boxShadow = 'none';
            clonedEl.style.transform = 'none';
            clonedEl.style.borderRadius = '0px';

            const glows = clonedEl.querySelectorAll('.cartelera-decor-glow');
            glows.forEach((g) => {
              (g as HTMLElement).style.display = 'none';
            });

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

  // 2. Descargar como PDF listo para imprimir
  const handleDownloadPdf = async () => {
    if (!printSheetRef.current) return;
    setExportingType('pdf');
    try {
      const canvas = await generateSheetCanvas(printSheetRef.current);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const isLandscape = orientation === 'landscape';
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      pdf.save(`Cartelera_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
      console.log('PDF de cartelera generado y descargado exitosamente');
    } catch (err: any) {
      console.error('Error generando PDF de cartelera:', err);
      alert('Hubo un inconveniente al generar el PDF. Puedes usar el botón "Imprimir Hoja" para guardarla como PDF directamente.');
    } finally {
      setExportingType(null);
    }
  };

  // 3. Descargar como Imagen PNG de alta calidad
  const handleDownloadImage = async () => {
    if (!printSheetRef.current) return;
    setExportingType('image');
    try {
      const canvas = await generateSheetCanvas(printSheetRef.current);

      canvas.toBlob((blob) => {
        try {
          if (!blob) {
            const link = document.createElement('a');
            link.download = `Cartelera_${MONTH_NAMES[selectedMonth]}_${selectedYear}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `Cartelera_${MONTH_NAMES[selectedMonth]}_${selectedYear}.png`;
          link.href = url;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          console.log('Imagen de cartelera guardada exitosamente');
        } finally {
          setExportingType(null);
        }
      }, 'image/png');
    } catch (err: any) {
      console.error('Error exportando imagen de cartelera:', err);
      alert('Hubo un inconveniente al generar la imagen. Puedes usar el botón "Imprimir Hoja" como alternativa.');
      setExportingType(null);
    }
  };

  // Cantidad de columnas óptima según cantidad y orientación
  const gridColsClass = useMemo(() => {
    const count = displayedActivities.length;
    if (orientation === 'landscape') {
      if (count <= 4) return 'grid-cols-2';
      if (count <= 9) return 'grid-cols-3';
      return 'grid-cols-4';
    } else {
      if (count <= 5) return 'grid-cols-1';
      if (count <= 12) return 'grid-cols-2';
      return 'grid-cols-2';
    }
  }, [displayedActivities.length, orientation]);

  return (
    <div className="space-y-6 pb-16">
      {/* Estilos específicos para impresión directa en papel tamaño Carta */}
      <style>{`
        @media print {
          body, html {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          nav, aside, header, .no-print, [role="navigation"] {
            display: none !important;
          }
          .cartelera-print-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: letter ${orientation};
            margin: 6mm;
          }
        }
      `}</style>

      {/* Cabecera del Módulo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-100">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Cartelera Mensual de Actividades
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Diseña e imprime el calendario visual de actividades en tamaño carta para colocar en la pizarra informativa o mampara del templo.
          </p>
        </div>

        {/* Acciones principales de exportación */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrint}
            disabled={exportingType !== null || displayedActivities.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-all shadow-xs active:scale-95 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Hoja</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={exportingType !== null || displayedActivities.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <Download className={`w-4 h-4 text-blue-700 ${exportingType === 'pdf' ? 'animate-bounce' : ''}`} />
            <span>{exportingType === 'pdf' ? 'Generando PDF...' : 'Descargar PDF'}</span>
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={exportingType !== null || displayedActivities.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <ImageIcon className={`w-4 h-4 text-emerald-700 ${exportingType === 'image' ? 'animate-bounce' : ''}`} />
            <span>{exportingType === 'image' ? 'Guardando imagen...' : 'Guardar Imagen'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Panel de Control (Izquierda) + Lienzo de Impresión (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* PANEL DE CONTROL / HERRAMIENTAS */}
        <div className="lg:col-span-4 space-y-5 no-print">
          
          {/* 1. Selector de Mes y Año */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-900" />
              Período a Imprimir
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={idx} value={idx}>{m}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Orientación y Paleta de Colores */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Layers className="w-3.5 h-3.5 text-blue-900" />
                Orientación del Papel (Carta)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrientation('portrait')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    orientation === 'portrait'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  📄 Vertical (Retrato)
                </button>
                <button
                  type="button"
                  onClick={() => setOrientation('landscape')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                    orientation === 'landscape'
                      ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  📃 Horizontal (Paisaje)
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <Palette className="w-3.5 h-3.5 text-blue-900" />
                Estilo & Paleta de Impresión
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(THEMES).map((t) => {
                  const isActive = themeKey === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setThemeKey(t.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative ${
                        isActive
                          ? 'border-slate-900 bg-slate-50 ring-2 ring-slate-900/10'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: t.accentColor }}
                        />
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {t.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 pl-5 truncate">
                        {t.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Lema / Versículo Bíblico del Mes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Quote className="w-3.5 h-3.5 text-blue-900" />
                Lema o Versículo del Mes
              </span>
              <span className="text-[10px] font-normal text-slate-400">Editable</span>
            </label>
            <textarea
              rows={2}
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-900/20 leading-relaxed resize-none"
              placeholder="Escribe un versículo bíblico o lema..."
            />
            
            {/* Sugerencias Rápidas */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Sugerencias rápidas:
              </span>
              <div className="flex flex-col gap-1">
                {VERSE_SUGGESTIONS.slice(0, 3).map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setVerseText(v)}
                    className="text-left text-[11px] text-slate-600 hover:text-blue-900 hover:bg-blue-50/50 p-1.5 rounded-lg transition-colors truncate"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Selector de Actividades para la Pizarra */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-900" />
                Actividades en Cartelera ({displayedActivities.length}/{monthActivities.length})
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-blue-900 hover:underline"
                >
                  Todas
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="text-[11px] font-medium text-slate-500 hover:underline"
                >
                  Ninguna
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 border border-slate-200/60 animate-pulse">
                Cargando actividades del calendario...
              </div>
            ) : monthActivities.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 text-center text-xs text-slate-500 border border-slate-200/60">
                No hay actividades registradas en {MONTH_NAMES[selectedMonth]} {selectedYear}.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {monthActivities.map((act) => {
                  const isChecked = selectedIds.includes(act.id);
                  const f = new Date(act.fecha);
                  const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
                  const dayNum = String(local.getDate()).padStart(2, '0');
                  const dayName = DAY_NAMES_SHORT[local.getDay()];

                  return (
                    <div
                      key={act.id}
                      onClick={() => toggleSelectId(act.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer select-none transition-all ${
                        isChecked
                          ? 'bg-blue-50/50 border-blue-200 text-slate-900'
                          : 'bg-white border-slate-200/70 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors shrink-0 ${
                          isChecked
                            ? 'bg-blue-900 border-blue-900 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>

                      <span className="font-bold text-[11px] text-slate-700 shrink-0 w-12">
                        {dayName} {dayNum}
                      </span>

                      <span className="font-medium truncate flex-1">
                        {act.actividad}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {displayedActivities.length > 12 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-xl flex items-center gap-1.5 border border-amber-200/60">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Tip: Para que las letras no se achiquen demasiado en la pizarra, se recomienda de 4 a 10 actividades.</span>
              </p>
            )}
          </div>

        </div>

        {/* LIENZO DE VISTA PREVIA IMPRESA (HOJA CARTA) */}
        <div className="lg:col-span-8 flex justify-center">
          <div className="w-full flex flex-col items-center">
            
            {/* Mensaje de proporción para pantalla */}
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-2 no-print">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Vista previa en proporción real de papel <strong>Carta (8.5 × 11 in)</strong></span>
            </div>

            {/* CONTENEDOR DE LA HOJA IMPRIMIBLE */}
            <div
              ref={printSheetRef}
              id="lienzo-cartelera-imprimible"
              className={`cartelera-print-container w-full max-w-[820px] shadow-2xl rounded-2xl border border-slate-300 overflow-hidden flex flex-col transition-all duration-300 ${theme.paperBg}`}
              style={{
                ...theme.paperBgStyle,
                aspectRatio: orientation === 'landscape' ? '11 / 8.5' : '8.5 / 11',
                minHeight: orientation === 'landscape' ? '560px' : '740px'
              }}
            >
              {/* ENCABEZADO INSTITUCIONAL DEL BOLETÍN */}
              <div
                style={theme.headerBgStyle}
                className={`${theme.headerText} p-6 sm:p-7 relative overflow-hidden shrink-0`}
              >
                <div className="relative z-10 flex items-center justify-between gap-4">
                  
                  {/* Bloque Izquierdo: Logotipo e Identidad */}
                  <div className="flex items-center gap-4">
                    <div
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
                      className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl p-1.5 border shadow-inner flex items-center justify-center shrink-0"
                    >
                      <img
                        src={LOGO_WHITE_BASE64}
                        alt="Logo ICLEB"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase opacity-80 block">
                        Iglesia Cristiana Luterana El Buen Pastor
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mt-0.5">
                        Agenda de Actividades
                      </h2>
                      <p className="text-[11px] sm:text-xs opacity-75 mt-0.5">
                        San Pedro Sula, Cortés • Colonia Unión
                      </p>
                    </div>
                  </div>

                  {/* Bloque Derecho: Mes y Año Protagonistas */}
                  <div className="text-right shrink-0">
                    <span
                      style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)', borderColor: 'rgba(255, 255, 255, 0.25)' }}
                      className="text-[11px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-md border inline-block mb-1"
                    >
                      CARTELERA OFICIAL
                    </span>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase tracking-tight text-white">
                      {MONTH_NAMES[selectedMonth]}
                    </h3>
                    <p className="text-base sm:text-lg font-bold opacity-90 tracking-wider">
                      {selectedYear}
                    </p>
                  </div>

                </div>

                {/* Sutil brillo decorativo */}
                <div
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  className="absolute -top-12 -right-12 w-48 h-48 rounded-full pointer-events-none cartelera-decor-glow"
                />
              </div>

              {/* CINTILLO CON EL LEMA / VERSÍCULO BÍBLICO */}
              {verseText.trim() && (
                <div
                  style={{
                    backgroundColor: theme.verseBgStyle.backgroundColor,
                    borderBottom: `1px solid ${theme.verseBgStyle.borderColor}`
                  }}
                  className="px-6 py-2.5 shrink-0 text-center"
                >
                  <p
                    style={{ color: theme.verseBgStyle.color }}
                    className="text-xs sm:text-sm font-semibold italic leading-snug tracking-tight"
                  >
                    {verseText}
                  </p>
                </div>
              )}

              {/* CUERPO DEL CALENDARIO: GRID DE TARJETAS */}
              <div className="flex-1 p-5 sm:p-6 overflow-hidden flex flex-col justify-start">
                {displayedActivities.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50">
                    <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                    <h4 className="text-base font-bold text-slate-700">Sin actividades seleccionadas</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Selecciona al menos una actividad en el panel izquierdo para armar la cartelera de este mes.
                    </p>
                  </div>
                ) : (
                  <div className={`grid ${gridColsClass} gap-3 sm:gap-3.5 w-full`}>
                    {displayedActivities.map((act) => {
                      const f = new Date(act.fecha);
                      const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
                      const dayNum = String(local.getDate()).padStart(2, '0');
                      const dayName = DAY_NAMES_SHORT[local.getDay()];
                      const catId = act.categoria || detectCategoryFromTitle(act.actividad);
                      const IconComponent = getCategoryIcon(catId);

                      return (
                        <div
                          key={act.id}
                          style={theme.cardBgStyle}
                          className={`${theme.cardBg} rounded-xl border ${theme.cardBorder} p-3 sm:p-3.5 shadow-2xs flex items-center gap-3.5 transition-all`}
                        >
                          {/* Bloque de fecha: Gran número y día de la semana */}
                          <div
                            style={theme.dayBadgeBgStyle}
                            className={`w-14 sm:w-16 h-14 sm:h-16 rounded-xl ${theme.dayBadgeBg} flex flex-col items-center justify-center shrink-0 shadow-xs`}
                          >
                            <span className="text-[10px] sm:text-[11px] font-black tracking-wider uppercase opacity-90 leading-none">
                              {dayName}
                            </span>
                            <span className="text-xl sm:text-2xl font-black leading-none mt-1">
                              {dayNum}
                            </span>
                          </div>

                          {/* Contenido: Título, categoría y notas */}
                          <div className="flex-1 min-w-0 pr-1">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="p-1 rounded-md bg-slate-100 text-slate-700 shrink-0">
                                <IconComponent className="w-3 h-3" />
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                {catId.toUpperCase()}
                              </span>
                            </div>

                            <h4 className={`text-xs sm:text-sm font-bold ${theme.titleColor} leading-snug line-clamp-2`}>
                              {act.actividad}
                            </h4>

                            {act.detalles ? (
                              <p className={`text-[11px] ${theme.mutedColor} mt-1 line-clamp-1 flex items-center gap-1`}>
                                <Clock className="w-3 h-3 shrink-0 opacity-70" />
                                <span>{act.detalles}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic mt-0.5">
                                Actividad congregacional
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* PIE DE PÁGINA INSTITUCIONAL DEL BOLETÍN */}
              <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
                <div className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Colonia Unión, San Pedro Sula • Iglesia Cristiana Luterana El Buen Pastor</span>
                </div>
                <div className="font-semibold text-slate-600 hidden sm:block">
                  «Una iglesia que ama, sirve y proclama»
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
