import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
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
  Square,
  Sparkles,
  Award,
  Calendar,
  Copy,
  Check,
  MessageCircle,
  Bookmark,
  Layers
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

type LayoutStyle = 'gala' | 'weekly' | 'cards';

interface ColorPalette {
  id: string;
  name: string;
  tagline: string;
  primary: string;
  accent: string;
  headerBg: { background: string };
  paperBg: { backgroundColor: string };
  cardBg: { backgroundColor: string; borderColor: string };
  ribbonBg: { backgroundColor: string; color: string };
  crestBorder: string;
  textColor: string;
}

const PALETTES: Record<string, ColorPalette> = {
  royal_gold: {
    id: 'royal_gold',
    name: 'Gala Azul Real & Oro',
    tagline: 'Solemne, majestuoso y con detalles dorados',
    primary: '#1E3A8A',
    accent: '#B45309',
    headerBg: { background: 'linear-gradient(135deg, #091124 0%, #172554 50%, #091124 100%)' },
    paperBg: { backgroundColor: '#FCFBF8' },
    cardBg: { backgroundColor: '#FFFFFF', borderColor: '#E5DFD5' },
    ribbonBg: { backgroundColor: '#1E3A8A', color: '#FDFBF7' },
    crestBorder: '#B45309',
    textColor: '#0F172A'
  },
  emerald_peace: {
    id: 'emerald_peace',
    name: 'Jardín de Gracia & Esmeralda',
    tagline: 'Vida, frescura y esperanza cristiana',
    primary: '#065F46',
    accent: '#D97706',
    headerBg: { background: 'linear-gradient(135deg, #02241b 0%, #064E3B 50%, #02241b 100%)' },
    paperBg: { backgroundColor: '#F8FAF9' },
    cardBg: { backgroundColor: '#FFFFFF', borderColor: '#D1E7DD' },
    ribbonBg: { backgroundColor: '#065F46', color: '#FFFFFF' },
    crestBorder: '#059669',
    textColor: '#064E3B'
  },
  ruby_warm: {
    id: 'ruby_warm',
    name: 'Borgoña & Cálido',
    tagline: 'Fraternidad, amor y celebración festiva',
    primary: '#881337',
    accent: '#E11D48',
    headerBg: { background: 'linear-gradient(135deg, #3B0715 0%, #881337 50%, #3B0715 100%)' },
    paperBg: { backgroundColor: '#FCF8F8' },
    cardBg: { backgroundColor: '#FFFFFF', borderColor: '#F8D7DA' },
    ribbonBg: { backgroundColor: '#881337', color: '#FFFFFF' },
    crestBorder: '#9F1239',
    textColor: '#4C0519'
  },
  classic_print: {
    id: 'classic_print',
    name: 'Blanco & Negro Editorial',
    tagline: 'Alto contraste nítido, ideal para fotocopiadoras',
    primary: '#0F172A',
    accent: '#334155',
    headerBg: { background: 'linear-gradient(135deg, #020617 0%, #1E293B 50%, #020617 100%)' },
    paperBg: { backgroundColor: '#FFFFFF' },
    cardBg: { backgroundColor: '#FFFFFF', borderColor: '#CBD5E1' },
    ribbonBg: { backgroundColor: '#0F172A', color: '#FFFFFF' },
    crestBorder: '#0F172A',
    textColor: '#0F172A'
  }
};

export default function BirthdaysView() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('gala');
  const [paletteKey, setPaletteKey] = useState<string>('royal_gold');
  const [selectedVerseId, setSelectedVerseId] = useState<string>('numeros6');
  const [customVerseText, setCustomVerseText] = useState<string>('');
  const [customVerseCitation, setCustomVerseCitation] = useState<string>('Dedicatoria Pastoral');
  const [showAge, setShowAge] = useState<boolean>(false);
  const [showCongregation, setShowCongregation] = useState<boolean>(true);

  // Cumpleañeros manuales
  const [manualBirthdays, setManualBirthdays] = useState<ManualBirthday[]>([]);
  const [isAddManualOpen, setIsAddManualOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualDay, setManualDay] = useState<number>(1);
  const [manualCongregation, setManualCongregation] = useState<string>('General');

  // IDs excluidos de la impresión
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  const printableRef = useRef<HTMLDivElement>(null);

  // Query de miembros
  const { data: miembros = [], isLoading } = useQuery<Miembro[]>({
    queryKey: ['miembros'],
    queryFn: async () => (await api.get('/miembros')).data
  });

  // Procesamiento y cálculo de cumpleañeros
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
      diasFaltantes: number;
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
        const bMonth = parseInt(parts[1], 10) - 1;
        const bDay = parseInt(parts[2], 10);

        if (bMonth === selectedMonth) {
          const targetDate = new Date(selectedYear, selectedMonth, bDay);
          const dayOfWeek = DAY_NAMES_SHORT[targetDate.getDay()];
          const edad = bYear ? selectedYear - bYear : undefined;

          const esHoy = isCurrentMonth && now.getDate() === bDay;
          const diff = bDay - now.getDate();
          const esEstaSemana = isCurrentMonth && diff >= 0 && diff <= 7;

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
            diasFaltantes: diff,
            esEstaSemana
          });
        }
      } catch (err) {
        console.error('Error parsing member birthday', err);
      }
    });

    // 2. Cumpleañeros adicionales
    manualBirthdays.forEach((man) => {
      const targetDate = new Date(selectedYear, selectedMonth, man.dia);
      const dayOfWeek = DAY_NAMES_SHORT[targetDate.getDay()];
      const edad = man.anioNac ? selectedYear - man.anioNac : undefined;

      const esHoy = isCurrentMonth && now.getDate() === man.dia;
      const diff = man.dia - now.getDate();
      const esEstaSemana = isCurrentMonth && diff >= 0 && diff <= 7;

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
        diasFaltantes: diff,
        esEstaSemana
      });
    });

    return list.sort((a, b) => a.dia - b.dia);
  }, [miembros, manualBirthdays, selectedMonth, selectedYear]);

  // Filtrar los que están seleccionados
  const displayedBirthdays = useMemo(() => {
    return allMonthBirthdays.filter((b) => !excludedIds.includes(b.uid));
  }, [allMonthBirthdays, excludedIds]);

  // Quienes cumplen hoy
  const todaysBirthdays = useMemo(() => {
    return allMonthBirthdays.filter((b) => b.esHoy);
  }, [allMonthBirthdays]);

  // Agrupación por semanas para el layout semanal
  const weeklyGroups = useMemo(() => {
    const weeks: Record<string, typeof displayedBirthdays> = {
      'Semana 1 (Días 1 al 7)': [],
      'Semana 2 (Días 8 al 14)': [],
      'Semana 3 (Días 15 al 21)': [],
      'Semana 4 y 5 (Días 22 al 31)': []
    };

    displayedBirthdays.forEach((b) => {
      if (b.dia <= 7) weeks['Semana 1 (Días 1 al 7)'].push(b);
      else if (b.dia <= 14) weeks['Semana 2 (Días 8 al 14)'].push(b);
      else if (b.dia <= 21) weeks['Semana 3 (Días 15 al 21)'].push(b);
      else weeks['Semana 4 y 5 (Días 22 al 31)'].push(b);
    });

    return Object.entries(weeks).filter(([_, items]) => items.length > 0);
  }, [displayedBirthdays]);

  // Versículo seleccionado
  const currentVerse = useMemo(() => {
    if (selectedVerseId === 'custom') {
      return {
        citation: customVerseCitation.trim() || 'Dedicatoria Pastoral',
        text: customVerseText.trim() || '«Damos gracias a Dios por sus vidas y oramos por bendición y paz sobre cada uno de ustedes.»'
      };
    }
    return BIBLE_VERSES.find((v) => v.id === selectedVerseId) || BIBLE_VERSES[0];
  }, [selectedVerseId, customVerseText, customVerseCitation]);

  // Paleta de color seleccionada
  const palette = PALETTES[paletteKey] || PALETTES.royal_gold;

  // Acciones de selección
  const toggleExcludeId = (uid: string) => {
    setExcludedIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = () => setExcludedIds([]);
  const handleDeselectAll = () => setExcludedIds(allMonthBirthdays.map((b) => b.uid));

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

  // Copiar felicitación para WhatsApp
  const handleCopyGreeting = (name: string) => {
    const greeting = `¡Feliz cumpleaños, ${name}! 🎂 Que nuestro buen Dios bendiga grandemente tu vida en este nuevo año, guarde tus pasos y derrame abundantes bendiciones y gozo sobre ti y tu familia. «El Señor te bendiga y te guarde; el Señor haga resplandecer su rostro sobre ti...» (Números 6:24). ¡Un abrazo fraternal de parte de tu familia en la Iglesia El Buen Pastor! ✨`;
    navigator.clipboard.writeText(greeting);
    setCopiedToast(`¡Felicitación copiada para ${name}!`);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Impresión Directa
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

  const handleDownloadImage = async () => {
    if (!printableRef.current || isGenerating) return;
    setIsGenerating(true);

    try {
      const canvas = await generateSheetCanvas(printableRef.current);
      const link = document.createElement('a');
      link.download = `Cartelera_Cumpleaneros_${MONTH_NAMES[selectedMonth]}_${selectedYear}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (err) {
      console.error('Error al generar imagen:', err);
      alert('Hubo un error al generar la imagen.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-16 font-sans text-slate-900">
      {/* Estilos para impresión nativa en tamaño Carta */}
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

      {/* Toast flotante para copia de felicitación */}
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

      <div className="pantalla-cumpleaneros space-y-6">
        
        {/* ======================================================== */}
        {/* 1. HERO FESTIVO INTERACTIVO (Diferente a Actividades)     */}
        {/* ======================================================== */}
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-slate-900 to-rose-950 text-white p-6 sm:p-8 shadow-xl border border-white/10">
          {/* Luces y brillo decorativo ambiental */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 left-10 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-amber-300 mb-3 shadow-inner">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Muro de Celebración de Vida</span>
              </div>
              
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Cumpleañeros de {MONTH_NAMES[selectedMonth]}</span>
                <Cake className="w-8 h-8 text-amber-400 shrink-0" />
              </h1>
              
              <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-xl mt-1.5 leading-relaxed">
                Celebra a los hermanos de la congregación con carteleras de diseño exclusivo tipo Gala, Almanaque o Postales para la pizarra informativa.
              </p>

              {/* Botonera de Navegación Rápida de Mes */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear((y) => y - 1);
                    } else setSelectedMonth((m) => m - 1);
                  }}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl px-3 py-1.5 text-xs font-extrabold focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx} className="bg-slate-900 text-white">
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl px-3 py-1.5 text-xs font-extrabold focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((y) => (
                    <option key={y} value={y} className="bg-slate-900 text-white">
                      {y}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear((y) => y + 1);
                    } else setSelectedMonth((m) => m + 1);
                  }}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setSelectedMonth(currentDate.getMonth());
                    setSelectedYear(currentDate.getFullYear());
                  }}
                  className="text-xs font-black px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-colors cursor-pointer shadow-xs"
                >
                  Ir al Mes Actual
                </button>
              </div>
            </div>

            {/* Tarjeta Destacada de "¡Cumpleañeros de Hoy!" */}
            <div className="w-full lg:w-80 shrink-0 bg-white/10 backdrop-blur-md rounded-3xl p-5 border border-white/15 shadow-xl">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <PartyPopper className="w-3.5 h-3.5" />
                  {todaysBirthdays.length > 0 ? '¡Hoy de Fiesta!' : 'Próximas Fiestas'}
                </span>
                <span className="text-[11px] font-extrabold text-white/80">
                  {allMonthBirthdays.length} en el mes
                </span>
              </div>

              {todaysBirthdays.length > 0 ? (
                <div className="space-y-2">
                  {todaysBirthdays.map((b) => (
                    <div
                      key={b.uid}
                      className="bg-white/15 p-3 rounded-2xl border border-amber-400/40 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate leading-tight">
                          {b.nombre}
                        </p>
                        <p className="text-[10px] font-semibold text-amber-200 mt-0.5">
                          ¡Cumpleaños hoy! 🎉
                        </p>
                      </div>
                      <button
                        onClick={() => handleCopyGreeting(b.nombre)}
                        className="p-2 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-transform active:scale-90 cursor-pointer shrink-0"
                        title="Copiar felicitación para WhatsApp"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2.5">
                  <p className="text-xs font-semibold text-white/90">
                    {allMonthBirthdays.length > 0
                      ? `Hay ${allMonthBirthdays.length} hermanos celebrando vida en ${MONTH_NAMES[selectedMonth]}.`
                      : `Sin cumpleaños registrados en ${MONTH_NAMES[selectedMonth]}.`}
                  </p>
                  <p className="text-[10px] text-white/60 mt-1">
                    Usa los botones de abajo para personalizar la hoja para la pizarra.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. SELECTOR DE PLANTILLAS Y HERRAMIENTAS DE DISEÑO       */}
        {/* ======================================================== */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 shadow-sm border border-white/80 space-y-5">
          
          {/* Selector de Layouts (3 Diseños Radicales) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-700" />
                <span>Elige el Formato de Diseño para la Pizarra:</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                Cambia el estilo al instante
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Opción 1: Gala Real & Medallones */}
              <button
                type="button"
                onClick={() => setLayoutStyle('gala')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  layoutStyle === 'gala'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                    : 'bg-white/80 hover:bg-white text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black">1. Gala & Medallones de Honor</span>
                  <Award className={`w-4 h-4 ${layoutStyle === 'gala' ? 'text-amber-400' : 'text-slate-400'}`} />
                </div>
                <p className={`text-[11px] leading-snug font-medium ${layoutStyle === 'gala' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Estilo institucional ceremonial con sello eclesial y medallones redondos para cada día.
                </p>
              </button>

              {/* Opción 2: Almanaque Semanal Mural */}
              <button
                type="button"
                onClick={() => setLayoutStyle('weekly')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  layoutStyle === 'weekly'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                    : 'bg-white/80 hover:bg-white text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black">2. Almanaque Semanal Mural</span>
                  <Calendar className={`w-4 h-4 ${layoutStyle === 'weekly' ? 'text-amber-400' : 'text-slate-400'}`} />
                </div>
                <p className={`text-[11px] leading-snug font-medium ${layoutStyle === 'weekly' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Agrupado en bloques semanales ordenados (Semana 1, 2, 3...) como un calendario de pared de arte.
                </p>
              </button>

              {/* Opción 3: Mosaico de Postales / Etiquetas */}
              <button
                type="button"
                onClick={() => setLayoutStyle('cards')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  layoutStyle === 'cards'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20'
                    : 'bg-white/80 hover:bg-white text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-black">3. Mosaico de Tarjetas de Fiesta</span>
                  <Gift className={`w-4 h-4 ${layoutStyle === 'cards' ? 'text-amber-400' : 'text-slate-400'}`} />
                </div>
                <p className={`text-[11px] leading-snug font-medium ${layoutStyle === 'cards' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Diseño de tarjetas de regalo con tipografía festiva y número de día en relieve artístico.
                </p>
              </button>
            </div>
          </div>

          {/* Fila de Ajustes: Paleta, Versículo, Privacidad y Exportación */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-200/70">
            {/* Paleta */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Paleta de Color
              </label>
              <select
                value={paletteKey}
                onChange={(e) => setPaletteKey(e.target.value)}
                className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                {Object.values(PALETTES).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Versículo */}
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

            {/* Privacidad */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Opciones de Visibilidad
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setShowAge(!showAge)}
                  className={`flex-1 px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    showAge
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white/80 text-slate-500 border-slate-200'
                  }`}
                  title="Mostrar u ocultar edad por discreción"
                >
                  {showAge ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{showAge ? 'Con Edad' : 'Sin Edad'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCongregation(!showCongregation)}
                  className={`flex-1 px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    showCongregation
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white/80 text-slate-500 border-slate-200'
                  }`}
                  title="Mostrar sede o congregación"
                >
                  <Church className="w-3.5 h-3.5" />
                  <span>{showCongregation ? 'Con Sede' : 'Sin Sede'}</span>
                </button>
              </div>
            </div>

            {/* Botonera de Exportación */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Acciones de Impresión
              </label>
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  onClick={handlePrint}
                  disabled={isGenerating}
                  className="flex-1 h-9 rounded-xl glass-button-secondary font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Imprimir directamente en hoja Carta"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={handleDownloadPdf}
                  disabled={isGenerating}
                  className="flex-1 h-9 rounded-xl bg-blue-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-800 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
                  title="Descargar PDF de alta resolución"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGenerating ? 'PDF...' : 'PDF'}</span>
                </button>

                <button
                  onClick={handleDownloadImage}
                  disabled={isGenerating}
                  className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center hover:bg-slate-800 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  title="Descargar Imagen PNG"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Campo si se elige versículo personalizado */}
          {selectedVerseId === 'custom' && (
            <div className="pt-2 border-t border-slate-200/50 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Título de la Dedicatoria
                </label>
                <input
                  type="text"
                  placeholder="Ej. Saludo Pastoral..."
                  value={customVerseCitation}
                  onChange={(e) => setCustomVerseCitation(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Mensaje o Versículo
                </label>
                <input
                  type="text"
                  placeholder="Escribe el mensaje cristiano de bendición..."
                  value={customVerseText}
                  onChange={(e) => setCustomVerseText(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. BARRA DE SELECCIÓN Y ADICIÓN DE PERSONAS              */}
        {/* ======================================================== */}
        <div className="glass-panel-subtle rounded-2xl p-4 border border-white/70 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-800">
              Personas en la Cartelera ({displayedBirthdays.length} de {allMonthBirthdays.length} seleccionados)
            </span>
            <div className="flex items-center gap-3">
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
              <button
                onClick={() => setIsAddManualOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shadow-xs ml-2"
              >
                <UserPlus className="w-3.5 h-3.5 text-amber-300" />
                <span>Agregar Adicional</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allMonthBirthdays.map((b) => {
              const isIncluded = !excludedIds.includes(b.uid);
              return (
                <div
                  key={b.uid}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                    isIncluded
                      ? 'bg-white text-slate-900 border-slate-300 shadow-2xs'
                      : 'bg-slate-100/70 text-slate-400 border-transparent line-through'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExcludeId(b.uid)}
                    className="flex items-center gap-1.5 cursor-pointer text-left"
                  >
                    {isIncluded ? (
                      <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span>
                      Día {b.dia}: {b.nombre}
                    </span>
                  </button>

                  {/* Botón rápido para felicitar por WhatsApp */}
                  <button
                    onClick={() => handleCopyGreeting(b.nombre)}
                    className="text-emerald-600 hover:text-emerald-800 ml-1 cursor-pointer"
                    title={`Copiar mensaje de felicitación para ${b.nombre}`}
                  >
                    <MessageCircle className="w-3 h-3" />
                  </button>

                  {b.esManual && (
                    <span
                      onClick={() => handleRemoveManual(b.id as string)}
                      className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer font-bold"
                      title="Eliminar"
                    >
                      ✕
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
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
      {/* 4. LIENZO IMPRIMIBLE DE LA CARTELERA (TAMAÑO CARTA PORTRAIT)              */}
      {/* ========================================================================= */}
      <div id="contenedor-impresion-cumpleaneros" className="mt-8 flex justify-center overflow-x-auto pb-8">
        <div
          ref={printableRef}
          id="lienzo-cumpleaneros-imprimible"
          style={{
            width: '816px',
            minHeight: '1056px',
            ...palette.paperBg
          }}
          className="relative shadow-2xl overflow-hidden flex flex-col justify-between p-10 border-4 border-double border-slate-300"
        >
          {/* Filete ornamental perimetral tipo Diploma / Cartel de Gala */}
          <div className="absolute inset-3 border-2 border-slate-300/60 pointer-events-none rounded-xl" />
          <div className="absolute inset-4 border border-dashed border-slate-200 pointer-events-none rounded-lg" />

          {/* PARTE SUPERIOR */}
          <div className="relative z-10 space-y-6">

            {/* ======================================================== */}
            {/* CABECERA: FORMATO 1 - GALA / CEREMONIAL                   */}
            {/* ======================================================== */}
            {layoutStyle === 'gala' && (
              <div className="text-center pt-2 pb-4 border-b-2 border-slate-200">
                {/* Blasón Central con Logo de la Iglesia */}
                <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-900 text-white shadow-md border-2 border-amber-400 mb-3">
                  <img
                    src={LOGO_WHITE_BASE64}
                    alt="Logo ICLEB"
                    className="w-12 h-12 object-contain"
                  />
                </div>

                <div className="space-y-1">
                  <span className="block text-[11px] font-extrabold tracking-[0.25em] uppercase text-slate-500 font-sans">
                    Iglesia Cristiana Luterana El Buen Pastor
                  </span>
                  
                  <h2
                    style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                    className="text-3xl font-black tracking-tight text-slate-900 uppercase"
                  >
                    Celebración de Vida & Cumpleañeros
                  </h2>

                  <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-slate-900 text-amber-300 text-xs font-black uppercase tracking-widest shadow-2xs mt-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* CABECERA: FORMATO 2 - ALMANAQUE SEMANAL                   */}
            {/* ======================================================== */}
            {layoutStyle === 'weekly' && (
              <div
                style={palette.headerBg}
                className="rounded-2xl p-6 text-white shadow-md flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 border border-white/20 flex items-center justify-center shrink-0">
                    <img
                      src={LOGO_WHITE_BASE64}
                      alt="Logo ICLEB"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-white/70">
                      Iglesia Cristiana Luterana El Buen Pastor
                    </span>
                    <h2
                      style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                      className="text-2xl font-black uppercase tracking-tight text-white mt-0.5"
                    >
                      Almanaque de Cumpleaños
                    </h2>
                    <span className="block text-xs font-semibold text-amber-300 mt-0.5">
                      {MONTH_NAMES[selectedMonth]} {selectedYear} • {displayedBirthdays.length} celebraciones
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white font-extrabold text-xs">
                    <Calendar className="w-4 h-4 text-amber-300" />
                    <span>Registro Semanal</span>
                  </div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* CABECERA: FORMATO 3 - POSTALES Y TARJETAS                */}
            {/* ======================================================== */}
            {layoutStyle === 'cards' && (
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 p-2 flex items-center justify-center shrink-0 shadow-sm border border-slate-800">
                    <img
                      src={LOGO_WHITE_BASE64}
                      alt="Logo ICLEB"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 block">
                      Iglesia El Buen Pastor
                    </span>
                    <h2
                      style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                      className="text-2xl font-black text-slate-900 tracking-tight uppercase"
                    >
                      Galería de Cumpleaños
                    </h2>
                    <span className="text-xs font-bold text-rose-700 block">
                      ¡Felicitaciones a los cumpleañeros de {MONTH_NAMES[selectedMonth]}!
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black uppercase tracking-wider">
                    {MONTH_NAMES[selectedMonth]} {selectedYear}
                  </span>
                </div>
              </div>
            )}

            {/* VERSÍCULO BÍBLICO DE BENDICIÓN (Diseño Pergamino Editorial) */}
            <div className="rounded-2xl p-4 bg-amber-50/60 border border-amber-200/80 text-amber-950 flex items-start gap-3 shadow-2xs">
              <Quote className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p
                  style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                  className="text-xs leading-relaxed italic text-slate-800"
                >
                  {currentVerse.text}
                </p>
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-800 mt-1">
                  — {currentVerse.citation}
                </p>
              </div>
            </div>

            {/* ======================================================== */}
            {/* CUERPO DEL TABLERO SEGÚN EL LAYOUT ELEGIDO               */}
            {/* ======================================================== */}
            {isLoading ? (
              <div className="py-24 text-center">
                <div className="w-8 h-8 border-2 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Cargando datos de cumpleaños...</p>
              </div>
            ) : displayedBirthdays.length === 0 ? (
              <div className="py-24 text-center rounded-2xl bg-white/70 border border-dashed border-slate-300">
                <Cake className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-slate-800">
                  No hay cumpleaños registrados para {MONTH_NAMES[selectedMonth]}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Puedes registrar nuevos miembros en el sistema o agregar cumpleañeros adicionales en la barra superior.
                </p>
              </div>
            ) : (
              <>
                {/* ---------------------------------------------------- */}
                {/* 1. LAYOUT GALA: Medallones Circulares & Honor        */}
                {/* ---------------------------------------------------- */}
                {layoutStyle === 'gala' && (
                  <div className="grid grid-cols-2 gap-3.5">
                    {displayedBirthdays.map((b) => (
                      <div
                        key={b.uid}
                        className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-3 relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Medallón Circular Dorado */}
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex flex-col items-center justify-center shrink-0 shadow-sm border border-amber-300">
                            <span className="text-base font-black leading-none tracking-tight">
                              {String(b.dia).padStart(2, '0')}
                            </span>
                            <span className="text-[7.5px] font-black uppercase tracking-widest mt-0.5 opacity-90 leading-none">
                              {b.diaSemana}
                            </span>
                          </div>

                          {/* Nombre & Datos */}
                          <div className="min-w-0">
                            <h4
                              style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                              className="text-xs font-bold text-slate-900 truncate leading-snug"
                            >
                              {b.nombre}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {showCongregation && (
                                <span className="text-[9.5px] font-semibold text-slate-500 truncate">
                                  {b.congregacion}
                                </span>
                              )}
                              {showAge && b.edad !== undefined && (
                                <span className="text-[9.5px] font-bold text-slate-600 bg-slate-100 px-1 rounded-sm">
                                  {b.edad} años
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-amber-500">
                          <Bookmark className="w-4 h-4 fill-amber-400 text-amber-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 2. LAYOUT WEEKLY: Almanaque Semanal por Bloques      */}
                {/* ---------------------------------------------------- */}
                {layoutStyle === 'weekly' && (
                  <div className="space-y-4">
                    {weeklyGroups.map(([weekTitle, items]) => (
                      <div key={weekTitle} className="bg-white/80 rounded-2xl p-3.5 border border-slate-200 shadow-2xs">
                        {/* Cabecera de la Semana */}
                        <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-700" />
                            <span>{weekTitle}</span>
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {items.length} {items.length === 1 ? 'cumpleañero' : 'cumpleañeros'}
                          </span>
                        </div>

                        {/* Personas de esta semana */}
                        <div className="grid grid-cols-2 gap-2">
                          {items.map((b) => (
                            <div
                              key={b.uid}
                              className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-200/60 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                                  {b.dia}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">
                                    {b.nombre}
                                  </p>
                                  <p className="text-[9.5px] font-medium text-slate-500 mt-0.5 truncate">
                                    {b.diaSemana} {showCongregation && `• ${b.congregacion}`}
                                  </p>
                                </div>
                              </div>
                              {showAge && b.edad !== undefined && (
                                <span className="text-[9.5px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                  {b.edad} años
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* 3. LAYOUT CARDS: Mosaico de Postales con Día Grande  */}
                {/* ---------------------------------------------------- */}
                {layoutStyle === 'cards' && (
                  <div className="grid grid-cols-3 gap-3">
                    {displayedBirthdays.map((b) => (
                      <div
                        key={b.uid}
                        className="bg-white rounded-2xl p-3 border-2 border-slate-200 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[95px]"
                      >
                        {/* Gran número del día en marca de agua de fondo */}
                        <span
                          style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                          className="absolute -bottom-2 -right-1 text-5xl font-black text-slate-100 select-none pointer-events-none"
                        >
                          {b.dia}
                        </span>

                        <div className="relative z-10">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Día {b.dia} • {b.diaSemana}
                            </span>
                            <Cake className="w-3.5 h-3.5 text-amber-500" />
                          </div>

                          <h4
                            style={{ fontFamily: "'Georgia', 'Cambria', serif" }}
                            className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight mt-1"
                          >
                            {b.nombre}
                          </h4>
                        </div>

                        <div className="relative z-10 pt-1.5 flex items-center justify-between text-[9.5px] font-semibold text-slate-500 border-t border-slate-100 mt-2">
                          <span className="truncate">{showCongregation ? b.congregacion : 'Hermano en Cristo'}</span>
                          {showAge && b.edad !== undefined && (
                            <span className="font-bold text-slate-700 shrink-0">{b.edad} años</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* PIE DE PÁGINA INSTITUCIONAL DE LA HOJA */}
          <div className="relative z-10 pt-4 mt-6 border-t-2 border-slate-300/80 flex items-center justify-between text-[10px] text-slate-500 font-sans">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-800 uppercase tracking-wider">
                Pizarra Informativa ICLEB
              </span>
              <span>•</span>
              <span className="italic">«La congregación ora por ricas bendiciones sobre cada vida»</span>
            </div>
            <div className="font-bold text-slate-400">
              Emitido: {MONTH_NAMES[selectedMonth]} {selectedYear}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
