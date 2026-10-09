import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Printer,
  Download,
  Image as ImageIcon,
  Quote,
  Gift,
  Cake,
  Eye,
  EyeOff,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  Church,
  CheckSquare,
  Square
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
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_SHORT = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

const BIBLE_VERSES = [
  {
    id: 'numeros6',
    citation: 'Números 6:24-26',
    text: '«El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti y tenga de ti misericordia; el Señor alce sobre ti su rostro y ponga en ti paz.»'
  },
  {
    id: 'salmo139',
    citation: 'Salmo 139:14',
    text: '«Te alabaré, porque formidables y maravillosas son tus obras; estoy maravillado, y mi alma lo sabe muy bien.»'
  },
  {
    id: 'jeremias29',
    citation: 'Jeremías 29:11',
    text: '«Porque yo sé los pensamientos que tengo acerca de vosotros, dice el Señor, pensamientos de paz y no de mal, para daros el fin que esperáis.»'
  },
  {
    id: 'salmo90',
    citation: 'Salmo 90:12',
    text: '«Enséñanos de tal modo a contar nuestros días, que traigamos al corazón sabiduría.»'
  },
  {
    id: 'proverbios9',
    citation: 'Proverbios 9:11',
    text: '«Porque por mí se aumentarán tus días, y años de vida se te añadirán.»'
  },
  {
    id: 'salmo118',
    citation: 'Salmo 118:24',
    text: '«Este es el día que hizo el Señor; nos gozaremos y alegraremos en él.»'
  },
  {
    id: 'salmo23',
    citation: 'Salmo 23:6',
    text: '«Ciertamente el bien y la misericordia me seguirán todos los días de mi vida, y en la casa del Señor moraré por largos días.»'
  }
];

interface ThemeStyle {
  id: string;
  name: string;
  tagline: string;
  accentColor: string;
  headerBgStyle: { background: string };
  paperBgStyle: { backgroundColor: string };
  cardBgStyle: { backgroundColor: string; borderColor: string };
  badgeBgStyle: { backgroundColor: string; color: string };
  badgeDayNumberColor: string;
  titleColor: string;
  mutedColor: string;
  verseBgStyle: { backgroundColor: string; borderColor: string; color: string };
  accentBorder: string;
}

const THEMES: Record<string, ThemeStyle> = {
  navy_gold: {
    id: 'navy_gold',
    name: 'Azul Real & Oro',
    tagline: 'Institucional & Solemne',
    accentColor: '#1E3A8A',
    headerBgStyle: { background: 'linear-gradient(to right, #090d16, #172554, #090d16)' },
    paperBgStyle: { backgroundColor: '#F8FAFC' },
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
    badgeBgStyle: { backgroundColor: '#1E3A8A', color: '#FFFFFF' },
    badgeDayNumberColor: '#D97706',
    titleColor: 'text-slate-900',
    mutedColor: 'text-slate-600',
    verseBgStyle: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#172554' },
    accentBorder: 'border-blue-900'
  },
  emerald: {
    id: 'emerald',
    name: 'Celebración de Vida',
    tagline: 'Fresco & Esperanza',
    accentColor: '#047857',
    headerBgStyle: { background: 'linear-gradient(to right, #022c22, #064e3b, #022c22)' },
    paperBgStyle: { backgroundColor: '#F4F7F5' },
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#D1FAE5' },
    badgeBgStyle: { backgroundColor: '#065F46', color: '#FFFFFF' },
    badgeDayNumberColor: '#10B981',
    titleColor: 'text-emerald-950',
    mutedColor: 'text-emerald-800',
    verseBgStyle: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#064E3B' },
    accentBorder: 'border-emerald-800'
  },
  burgundy: {
    id: 'burgundy',
    name: 'Borgoña & Cálido',
    tagline: 'Gala, Gozo & Fraternidad',
    accentColor: '#881337',
    headerBgStyle: { background: 'linear-gradient(to right, #4c0519, #881337, #4c0519)' },
    paperBgStyle: { backgroundColor: '#FFF5F5' },
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#FECDD3' },
    badgeBgStyle: { backgroundColor: '#9F1239', color: '#FFFFFF' },
    badgeDayNumberColor: '#F43F5E',
    titleColor: 'text-rose-950',
    mutedColor: 'text-rose-900',
    verseBgStyle: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', color: '#881337' },
    accentBorder: 'border-rose-900'
  },
  bw_minimal: {
    id: 'bw_minimal',
    name: 'Blanco & Negro',
    tagline: 'Económico & Alto Contraste',
    accentColor: '#0F172A',
    headerBgStyle: { background: 'linear-gradient(to right, #020617, #1E293B, #020617)' },
    paperBgStyle: { backgroundColor: '#FFFFFF' },
    cardBgStyle: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
    badgeBgStyle: { backgroundColor: '#0F172A', color: '#FFFFFF' },
    badgeDayNumberColor: '#F8FAFC',
    titleColor: 'text-slate-900',
    mutedColor: 'text-slate-700',
    verseBgStyle: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', color: '#0F172A' },
    accentBorder: 'border-slate-900'
  }
};

export default function BirthdaysView() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [themeKey, setThemeKey] = useState<string>('navy_gold');
  const [selectedVerseId, setSelectedVerseId] = useState<string>('numeros6');
  const [customVerseText, setCustomVerseText] = useState<string>('');
  const [customVerseCitation, setCustomVerseCitation] = useState<string>('Dedicatoria Pastoral');
  const [showAge, setShowAge] = useState<boolean>(false);
  const [showCongregation, setShowCongregation] = useState<boolean>(true);
  const [columnsOption, setColumnsOption] = useState<'auto' | '1' | '2' | '3'>('auto');

  // Personas manuales temporales agregadas para esta cartelera
  const [manualBirthdays, setManualBirthdays] = useState<ManualBirthday[]>([]);
  const [isAddManualOpen, setIsAddManualOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualDay, setManualDay] = useState<number>(1);
  const [manualCongregation, setManualCongregation] = useState<string>('General');

  // Lista de IDs excluidos temporalmente de la cartelera
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const printableRef = useRef<HTMLDivElement>(null);

  // Consulta de miembros
  const { data: miembros = [], isLoading } = useQuery<Miembro[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data
  });

  // Procesar cumpleañeros del mes
  const allMonthBirthdays = useMemo(() => {
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
      esEstaSemana: boolean;
    }> = [];

    const now = new Date();
    const isCurrentMonth = now.getFullYear() === selectedYear && now.getMonth() === selectedMonth;

    // 1. De los miembros registrados
    miembros.forEach((m) => {
      if (!m.fecha_nacimiento) return;
      try {
        const raw = m.fecha_nacimiento.split('T')[0];
        const parts = raw.split('-');
        if (parts.length < 3) return;
        const bYear = parseInt(parts[0], 10);
        const bMonth = parseInt(parts[1], 10) - 1; // 0-indexed
        const bDay = parseInt(parts[2], 10);

        if (bMonth === selectedMonth) {
          const targetDate = new Date(selectedYear, selectedMonth, bDay);
          const dayOfWeek = DAY_NAMES_SHORT[targetDate.getDay()];
          const edad = bYear ? selectedYear - bYear : undefined;

          const esHoy = isCurrentMonth && now.getDate() === bDay;
          const diff = bDay - now.getDate();
          const esEstaSemana = isCurrentMonth && diff > 0 && diff <= 7;

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
            esEstaSemana
          });
        }
      } catch (err) {
        console.error('Error parsing birthday', err);
      }
    });

    // 2. Cumpleañeros manuales agregados
    manualBirthdays.forEach((man) => {
      const targetDate = new Date(selectedYear, selectedMonth, man.dia);
      const dayOfWeek = DAY_NAMES_SHORT[targetDate.getDay()];
      const edad = man.anioNac ? selectedYear - man.anioNac : undefined;

      const esHoy = isCurrentMonth && now.getDate() === man.dia;
      const diff = man.dia - now.getDate();
      const esEstaSemana = isCurrentMonth && diff > 0 && diff <= 7;

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
        esEstaSemana
      });
    });

    // Ordenar cronológicamente por día del mes
    return list.sort((a, b) => a.dia - b.dia);
  }, [miembros, manualBirthdays, selectedMonth, selectedYear]);

  // Filtrar los que están seleccionados (no excluidos)
  const displayedBirthdays = useMemo(() => {
    return allMonthBirthdays.filter((b) => !excludedIds.includes(b.uid));
  }, [allMonthBirthdays, excludedIds]);

  // Cuántos cumplen hoy
  const todayCount = useMemo(() => {
    return allMonthBirthdays.filter((b) => b.esHoy).length;
  }, [allMonthBirthdays]);

  // Selección de versículo
  const currentVerse = useMemo(() => {
    if (selectedVerseId === 'custom') {
      return {
        citation: customVerseCitation.trim() || 'Dedicatoria Pastoral',
        text: customVerseText.trim() || '«Damos gracias a Dios por sus vidas y oramos por bendición y paz sobre cada uno de ustedes.»'
      };
    }
    return BIBLE_VERSES.find((v) => v.id === selectedVerseId) || BIBLE_VERSES[0];
  }, [selectedVerseId, customVerseText, customVerseCitation]);

  // Tema activo
  const theme = THEMES[themeKey] || THEMES.navy_gold;

  // Manejador de exclusión/inclusión
  const toggleExcludeId = (uid: string) => {
    setExcludedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = () => {
    setExcludedIds([]);
  };

  const handleDeselectAll = () => {
    setExcludedIds(allMonthBirthdays.map((b) => b.uid));
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

  const handleRemoveManual = (id: string) => {
    setManualBirthdays((prev) => prev.filter((m) => m.id !== id));
  };

  // 1. Impresión directa nativa
  const handlePrint = () => {
    window.print();
  };

  // 2. Generador de Canvas para PDF e Imagen
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

  // 3. Descargar PDF
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

      // Letter: 612 x 792 pt
      pdf.addImage(imgData, 'JPEG', 0, 0, 612, 792, undefined, 'FAST');
      pdf.save(`Cumpleaneros_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
      alert('Hubo un error al generar el PDF. Por favor intenta con el botón Imprimir.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 4. Guardar como Imagen PNG
  const handleDownloadImage = async () => {
    if (!printableRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const canvas = await generateSheetCanvas(printableRef.current);
      const link = document.createElement('a');
      link.download = `Cumpleaneros_${MONTH_NAMES[selectedMonth]}_${selectedYear}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Error al generar imagen:', err);
      alert('Hubo un error al generar la imagen. Por favor intenta con el botón Imprimir.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Determinar número de columnas para el layout de la hoja
  const computedColumns = useMemo(() => {
    if (columnsOption !== 'auto') return parseInt(columnsOption, 10);
    const count = displayedBirthdays.length;
    if (count <= 6) return 1;
    if (count <= 16) return 2;
    return 3;
  }, [columnsOption, displayedBirthdays.length]);

  return (
    <div className="pb-16 font-sans text-slate-900">
      {/* CSS para impresión limpia en tamaño Carta sin bordes ni elementos externos */}
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
            margin: 0.3in;
          }
        }
      `}</style>

      {/* Encabezado y Navegación del Módulo en Pantalla */}
      <div className="pantalla-cumpleaneros space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border border-white/80 shadow-xs mb-2 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
              <span className="text-[11px] font-extrabold tracking-wider text-slate-700 uppercase">
                Celebraciones Congregacionales
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Cumpleañeros del Mes
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
              Diseña, imprime y publica la cartelera mensual de cumpleaños para la pizarra informativa de la iglesia.
            </p>
          </div>

          {/* Acciones Principales de Exportación */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="glass-button-secondary inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer shadow-xs active:scale-95 transition-all"
              title="Imprimir directamente en tamaño Carta"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGenerating}
              className="glass-button-secondary inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-blue-900 bg-blue-50/70 border border-blue-200/80 hover:bg-blue-100/80 cursor-pointer shadow-xs active:scale-95 transition-all disabled:opacity-60"
              title="Descargar archivo PDF vectorial en alta definición"
            >
              <Download className="w-4 h-4 text-blue-800" />
              <span>{isGenerating ? 'Generando...' : 'Descargar PDF'}</span>
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer active:scale-95 transition-all disabled:opacity-60"
              title="Guardar como imagen PNG para WhatsApp y redes"
            >
              <ImageIcon className="w-4 h-4 text-white" />
              <span>Guardar Imagen</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros, Meses y Personalización */}
        <div className="glass-panel rounded-3xl p-4 sm:p-5 shadow-xs border border-white/80 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Navegación Mes / Año */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (selectedMonth === 0) {
                    setSelectedMonth(11);
                    setSelectedYear((prev) => prev - 1);
                  } else {
                    setSelectedMonth((prev) => prev - 1);
                  }
                }}
                className="w-9 h-9 rounded-xl glass-button-secondary flex items-center justify-center text-slate-700 cursor-pointer"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="glass-input rounded-2xl px-3.5 py-2 text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="glass-input rounded-2xl px-3.5 py-2 text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  if (selectedMonth === 11) {
                    setSelectedMonth(0);
                    setSelectedYear((prev) => prev + 1);
                  } else {
                    setSelectedMonth((prev) => prev + 1);
                  }
                }}
                className="w-9 h-9 rounded-xl glass-button-secondary flex items-center justify-center text-slate-700 cursor-pointer"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setSelectedMonth(currentDate.getMonth());
                  setSelectedYear(currentDate.getFullYear());
                }}
                className="text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-white px-3 py-2 rounded-xl transition-all shadow-xs cursor-pointer ml-1"
              >
                Hoy
              </button>
            </div>

            {/* Resumen de Datos del Mes */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs shadow-2xs">
                <Cake className="w-3.5 h-3.5 text-amber-300" />
                <span>{allMonthBirthdays.length} {allMonthBirthdays.length === 1 ? 'cumpleañero' : 'cumpleañeros'}</span>
              </span>

              {todayCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white font-black text-xs shadow-2xs animate-pulse">
                  <PartyPopper className="w-3.5 h-3.5" />
                  <span>¡{todayCount} cumple hoy!</span>
                </span>
              )}

              <button
                onClick={() => setIsAddManualOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Agregar temporalmente a alguien que no esté en la base de datos de miembros"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-700" />
                <span>Agregar Adicional</span>
              </button>
            </div>
          </div>

          {/* Selector de Tema y Opciones de Impresión */}
          <div className="pt-3 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* 1. Selector de Tema */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Estilo Visual (Paleta)
              </label>
              <select
                value={themeKey}
                onChange={(e) => setThemeKey(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {Object.values(THEMES).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Selector de Versículo */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Versículo Bíblico
              </label>
              <select
                value={selectedVerseId}
                onChange={(e) => setSelectedVerseId(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {BIBLE_VERSES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.citation}
                  </option>
                ))}
                <option value="custom">Dedicatoria Personalizada...</option>
              </select>
            </div>

            {/* 3. Columnas en Hoja */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Columnas en Pizarra
              </label>
              <select
                value={columnsOption}
                onChange={(e) => setColumnsOption(e.target.value as any)}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="auto">Automático ({computedColumns} col)</option>
                <option value="1">1 Columna (Lista amplia)</option>
                <option value="2">2 Columnas (Equilibrado)</option>
                <option value="3">3 Columnas (Compacto)</option>
              </select>
            </div>

            {/* 4. Privacidad y Detalles */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Opciones de Privacidad
              </label>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAge(!showAge)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showAge
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white/80 text-slate-500 border-slate-200'
                  }`}
                  title={showAge ? 'Edad visible en la pizarra' : 'Edad oculta por discreción'}
                >
                  {showAge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showAge ? 'Mostrar Edad' : 'Ocultar Edad'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCongregation(!showCongregation)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    showCongregation
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white/80 text-slate-500 border-slate-200'
                  }`}
                  title="Mostrar nombre de congregación"
                >
                  <Church className="w-3.5 h-3.5" />
                  <span>{showCongregation ? 'Congregación' : 'Sin Sede'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Campo si se elige versículo personalizado */}
          {selectedVerseId === 'custom' && (
            <div className="pt-2 border-t border-slate-200/50 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Título / Cita
                </label>
                <input
                  type="text"
                  placeholder="Ej. Dedicatoria Pastoral o Cita Bíblica"
                  value={customVerseCitation}
                  onChange={(e) => setCustomVerseCitation(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Mensaje o Bendición
                </label>
                <input
                  type="text"
                  placeholder="Escribe el mensaje que aparecerá en la parte superior..."
                  value={customVerseText}
                  onChange={(e) => setCustomVerseText(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Panel Interactivo: Lista y Filtro de Personas antes de Imprimir */}
        {allMonthBirthdays.length > 0 && (
          <div className="glass-panel-subtle rounded-2xl p-4 border border-white/70">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <span className="text-xs font-extrabold text-slate-700">
                Personas incluidas en la impresión ({displayedBirthdays.length} de {allMonthBirthdays.length})
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  Seleccionar Todos
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-[11px] font-bold text-slate-500 hover:underline cursor-pointer"
                >
                  Deseleccionar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {allMonthBirthdays.map((b) => {
                const isIncluded = !excludedIds.includes(b.uid);
                return (
                  <button
                    key={b.uid}
                    type="button"
                    onClick={() => toggleExcludeId(b.uid)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isIncluded
                        ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                        : 'bg-slate-100/70 text-slate-400 border-transparent line-through'
                    }`}
                  >
                    {isIncluded ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>
                      Día {b.dia}: {b.nombre}
                    </span>
                    {b.esManual && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded-sm ml-0.5">
                        manual
                      </span>
                    )}
                    {b.esManual && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveManual(b.id as string);
                        }}
                        className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        title="Eliminar"
                      >
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal para Agregar Cumpleañero Manual / Visita */}
      {isAddManualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="glass-panel-elevated rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Agregar Cumpleañero Adicional
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
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
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
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none"
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
                    className="glass-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddManualOpen(false)}
                  className="glass-button-secondary flex-1 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. LIENZO IMPRIMIBLE DE LA CARTELERA (Para la Pizarra y PDF)              */}
      {/* ========================================================================= */}
      <div id="contenedor-impresion-cumpleaneros" className="mt-8 flex justify-center overflow-x-auto pb-8">
        <div
          ref={printableRef}
          id="lienzo-cumpleaneros-imprimible"
          style={{
            width: '816px',
            minHeight: '1056px',
            ...theme.paperBgStyle
          }}
          className="relative rounded-3xl shadow-xl overflow-hidden flex flex-col justify-between p-8 sm:p-10 border border-slate-300/60"
        >
          {/* Parte Superior: Encabezado Institucional + Versículo */}
          <div className="space-y-6">
            
            {/* Header Institucional con Logo en Letras Blancas */}
            <div
              style={theme.headerBgStyle}
              className="rounded-3xl p-6 text-white shadow-md relative overflow-hidden"
            >
              {/* Reflejos decorativos sutiles */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-4 relative z-10">
                {/* Bloque Izquierdo: Logo y Nombre de la Iglesia */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 flex items-center justify-center border border-white/20 shrink-0">
                    <img
                      src={LOGO_WHITE_BASE64}
                      alt="Logo ICLEB"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="block text-[11px] font-bold tracking-widest uppercase text-white/80">
                      Iglesia Cristiana Luterana El Buen Pastor
                    </span>
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase mt-0.5">
                      Cumpleañeros del Mes
                    </h2>
                    <span className="block text-xs font-semibold text-white/70 mt-0.5">
                      Celebrando el don de la vida y la gracia de Dios
                    </span>
                  </div>
                </div>

                {/* Bloque Derecho: Mes y Año Destacado */}
                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1 rounded-xl bg-white/20 border border-white/30 text-[11px] font-black tracking-wider uppercase text-white mb-1 shadow-2xs">
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </span>
                  <div className="flex items-center justify-end gap-1.5 text-white/90">
                    <Gift className="w-4 h-4 text-amber-300" />
                    <span className="text-xs font-black">
                      {displayedBirthdays.length} {displayedBirthdays.length === 1 ? 'Celebración' : 'Celebraciones'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta de Versículo Bíblico de Bendición */}
            <div
              style={theme.verseBgStyle}
              className="rounded-2xl p-4.5 border flex items-start gap-3.5 shadow-2xs"
            >
              <div className="w-9 h-9 rounded-xl bg-white/80 flex items-center justify-center shrink-0 shadow-2xs border border-white">
                <Quote className="w-4 h-4 text-slate-800" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-relaxed italic">
                  {currentVerse.text}
                </p>
                <p className="text-[11px] font-extrabold uppercase tracking-wider mt-1 opacity-90">
                  — {currentVerse.citation}
                </p>
              </div>
            </div>

            {/* Grid / Lista de Cumpleañeros */}
            {isLoading ? (
              <div className="py-20 text-center rounded-2xl bg-white/60 border border-slate-200">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Cargando lista de cumpleaños...</p>
              </div>
            ) : displayedBirthdays.length === 0 ? (
              <div className="py-20 text-center rounded-2xl bg-white/60 border border-dashed border-slate-300">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <Cake className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  No hay cumpleaños registrados para {MONTH_NAMES[selectedMonth]}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Puedes registrar nuevos miembros en el módulo de Miembros o agregar uno adicional con el botón superior.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${computedColumns}, minmax(0, 1fr))`,
                  gap: '12px'
                }}
              >
                {displayedBirthdays.map((b) => (
                  <div
                    key={b.uid}
                    style={theme.cardBgStyle}
                    className="rounded-2xl p-3.5 border shadow-2xs flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Badge con el Día del Mes */}
                      <div
                        style={theme.badgeBgStyle}
                        className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-2xs"
                      >
                        <span className="text-base font-black leading-none">
                          {String(b.dia).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-wider mt-0.5 opacity-80 leading-none">
                          {b.diaSemana}
                        </span>
                      </div>

                      {/* Nombre y Detalles */}
                      <div className="min-w-0">
                        <h4 className={`text-xs font-extrabold truncate leading-tight ${theme.titleColor}`}>
                          {b.nombre}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {showCongregation && (
                            <span className="text-[10px] font-semibold text-slate-500 truncate">
                              {b.congregacion}
                            </span>
                          )}
                          {showAge && b.edad !== undefined && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded-md">
                              {b.edad} años
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ícono de Regalo / Cumpleaños */}
                    <div className="shrink-0 text-amber-500 opacity-90">
                      <Gift className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pie de Página Institucional */}
          <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-700 uppercase tracking-wider">
                Pizarra Informativa ICLEB
              </span>
              <span>•</span>
              <span>«Dando gracias al Señor en todo tiempo»</span>
            </div>
            <div className="font-semibold text-slate-400">
              Emitido: {MONTH_NAMES[selectedMonth]} {selectedYear}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
