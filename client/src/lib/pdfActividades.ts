import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_ICLEB_BASE64 } from './logoBase64';

export interface Actividad {
  id: number;
  fecha: string;
  actividad: string;
  detalles: string;
  completado: boolean;
}

export function generarPDFActividades(
  actividades: Actividad[],
  anio: number = new Date().getFullYear(),
  semestre: number | string = 1
) {
  // Hoja en tamaño carta estándar (Letter: 215.9 x 279.4 mm)
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  // Paleta de colores ejecutivos de alto contraste para máxima legibilidad
  const primary: [number, number, number]    = [15, 23, 42];     // Slate-900 (Titular y texto oscuro)
  const accent: [number, number, number]     = [79, 70, 229];    // Indigo-600 (Acento institucional)
  const textDark: [number, number, number]   = [15, 23, 42];     // Slate-900 (Cuerpo principal)
  const textMuted: [number, number, number]  = [71, 85, 105];    // Slate-600 (Gris oscuro de alto contraste)
  const textLight: [number, number, number]  = [100, 116, 139];  // Slate-500 (Etiquetas)
  const borderCol: [number, number, number]  = [203, 213, 225];  // Slate-300 (Bordes y cuadrículas)
  const borderLight: [number, number, number]= [226, 232, 240];  // Slate-200 (Separadores suaves)
  const bgCard: [number, number, number]     = [255, 255, 255];  // Blanco puro
  const bgRowAlt: [number, number, number]   = [248, 250, 252];  // Slate-50 (Fila alterna)
  const green: [number, number, number]      = [21, 128, 61];    // Green-700 (Completado)
  const amber: [number, number, number]      = [180, 83, 9];     // Amber-700 (Pendiente)

  // Dimensiones y márgenes
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const usableWidth = pageWidth - margin * 2; // 187.9 mm

  // 1. Barra de acento superior institucional
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 4, 'F');

  // Determinar texto del período
  const semNum = Number(semestre);
  let periodoTexto = `AÑO ${anio}`;
  let semFileTag = `Anual_${anio}`;
  let periodoCorto = `AÑO ${anio}`;

  if (semNum === 1) {
    periodoTexto = `PRIMER SEMESTRE ${anio} (ENERO - JUNIO)`;
    periodoCorto = `1ER SEMESTRE ${anio}`;
    semFileTag = `1er_Semestre_${anio}`;
  } else if (semNum === 2) {
    periodoTexto = `SEGUNDO SEMESTRE ${anio} (JULIO - DICIEMBRE)`;
    periodoCorto = `2DO SEMESTRE ${anio}`;
    semFileTag = `2do_Semestre_${anio}`;
  } else if (semestre) {
    periodoTexto = `${String(semestre).toUpperCase()} ${anio}`;
    periodoCorto = String(semestre).toUpperCase();
    semFileTag = `${String(semestre).replace(/\s+/g, '_')}_${anio}`;
  }

  // 2. Encabezado Oficial con Logotipo Completo
  const logoWidth = 19;
  const logoHeight = 19;
  const logoY = 8.5;

  // Insertar logotipo oficial en alta resolución a color
  try {
    doc.addImage(LOGO_ICLEB_BASE64, 'PNG', margin, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.error('Error insertando logotipo en PDF:', err);
  }

  // Cuadro de Control Administrativo a la derecha
  const adminBoxWidth = 48;
  const adminBoxHeight = 19;
  const adminBoxX = pageWidth - margin - adminBoxWidth;
  const adminBoxY = 8.5;

  // 1. Fondo de la tarjeta con esquinas redondeadas
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(adminBoxX, adminBoxY, adminBoxWidth, adminBoxHeight, 1.5, 1.5, 'F');

  // 2. Barra de título del cuadro administrativo (con esquinas superiores redondeadas)
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(adminBoxX, adminBoxY, adminBoxWidth, 4.5, 1.5, 1.5, 'F');
  doc.rect(adminBoxX, adminBoxY + 2, adminBoxWidth, 2.5, 'F');

  // 3. Línea divisoria formal de la cabecera
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.3);
  doc.line(adminBoxX, adminBoxY + 4.5, adminBoxX + adminBoxWidth, adminBoxY + 4.5);

  // 4. Borde perimetral exterior nítido (al final para contorno perfecto)
  doc.roundedRect(adminBoxX, adminBoxY, adminBoxWidth, adminBoxHeight, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...textDark);
  doc.text('CONTROL ADMINISTRATIVO', adminBoxX + adminBoxWidth / 2, adminBoxY + 3.2, { align: 'center' });

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textDark);
  doc.text(`CÓDIGO: ACT-${anio}-S${semNum || 1}`, adminBoxX + 3, adminBoxY + 8);
  doc.text(`PERÍODO: ${periodoCorto}`, adminBoxX + 3, adminBoxY + 11.8);
  doc.text(`EMISIÓN: ${fechaHoy}`, adminBoxX + 3, adminBoxY + 15.5);

  // Textos institucionales al centro (sin colisiones con el cuadro administrativo)
  const headerTextX = margin + logoWidth + 4;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text('IGLESIA CRISTIANA LUTERANA EL BUEN PASTOR', headerTextX, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text('PLAN PASTORAL DE ACTIVIDADES', headerTextX, 17.5);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textDark);
  doc.text(periodoTexto, headerTextX, 22);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Desarrollado, planeado y consensuado por el Equipo Pastoral • Col. Unión, SPS', headerTextX, 26);

  // Línea divisoria formal
  const dividerY = adminBoxY + adminBoxHeight + 3.5;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.35);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // 3. Fila de KPIs Ejecutivos (Estructura de 3 niveles: Etiqueta -> Cifra Grande -> Descripción)
  const kpiY = dividerY + 3;
  const totalActividades = actividades.length;
  const completadas = actividades.filter(a => a.completado).length;
  const pendientes = totalActividades - completadas;
  const pctCumplimiento = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;

  const kpis = [
    { label: 'ACTIVIDADES PROGRAMADAS', val: `${totalActividades}`, sub: 'Total registrado en el período', col: primary },
    { label: 'EJECUTADAS / COMPLETADAS', val: `${completadas}`, sub: 'Realizadas con éxito', col: green },
    { label: 'EN CURSO / PENDIENTES', val: `${pendientes}`, sub: 'Por realizar / Pendientes', col: amber },
    { label: 'CUMPLIMIENTO PASTORAL', val: `${pctCumplimiento}%`, sub: 'Meta global alcanzada', col: accent }
  ];

  const gap = 2.5;
  const kpiWidth = (usableWidth - gap * (kpis.length - 1)) / kpis.length;
  const kpiHeight = 14;

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + gap);

    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.25);
    doc.roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    // Nivel 1: Etiqueta superior
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(...textLight);
    doc.text(kpi.label, kpiX + 3.5, kpiY + 4);

    // Nivel 2: Cifra grande de alto impacto visual
    doc.setFontSize(12);
    doc.setTextColor(...kpi.col);
    doc.text(kpi.val, kpiX + 3.5, kpiY + 9.5);

    // Nivel 3: Subtítulo explicativo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...textLight);
    doc.text(kpi.sub, kpiX + 3.5, kpiY + 12.8);
  });

  // 4. Preparación de datos ordenados cronológicamente
  const datosOrdenados = [...actividades].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const cuerpoTabla = datosOrdenados.map((item, index) => {
    const f = new Date(item.fecha);
    const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);

    const weekday = local.toLocaleDateString('es-ES', { weekday: 'short' });
    const capWeekday = weekday ? (weekday.charAt(0).toUpperCase() + weekday.slice(1, 3)).replace('.', '') : '';
    const day = String(local.getDate()).padStart(2, '0');
    const monthStr = local.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
    const capMonth = monthStr ? (monthStr.charAt(0).toUpperCase() + monthStr.slice(1, 3)) : '';
    const fechaTexto = `${capWeekday} ${day} ${capMonth} ${local.getFullYear()}`;

    return [
      String(index + 1),
      fechaTexto,
      item.actividad,
      item.detalles ? item.detalles.trim() : '—',
      item.completado ? 'Completado' : 'Pendiente'
    ];
  });

  // 5. Tabla Administrativa de Alta Legibilidad para Personas Adultas
  autoTable(doc, {
    startY: kpiY + kpiHeight + 3.5,
    margin: { left: margin, right: margin, top: 12, bottom: 22 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    head: [['N°', 'FECHA', 'ACTIVIDAD PASTORAL', 'DETALLES / LUGAR / RESPONSABLE', 'ESTADO']],
    body: cuerpoTabla,
    theme: 'plain',
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.8,
      cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
      valign: 'middle',
      lineWidth: 0
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5, // Tamaño adecuado para lectura cómoda de adultos
      cellPadding: { top: 2.7, bottom: 2.7, left: 3, right: 3 },
      valign: 'middle',
      textColor: textDark,
      lineWidth: { bottom: 0.15 },
      lineColor: borderLight,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: bgRowAlt
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center', textColor: textLight, fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 28, halign: 'center', fontStyle: 'bold', textColor: primary, fontSize: 8.5 },
      2: { cellWidth: 58, fontStyle: 'bold', textColor: textDark, fontSize: 8.5 },
      3: { cellWidth: 66.9, textColor: textMuted, fontStyle: 'normal', fontSize: 8 },
      4: { cellWidth: 26, halign: 'center' }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = (data.row.raw as string[])[4];
        const isDone = text === 'Completado';

        // Píldoras contrastadas: Verde bosque para completado, Ámbar cálido para pendiente
        const pillBg: [number, number, number]   = isDone ? [240, 253, 244] : [254, 243, 199];
        const pillBdr: [number, number, number]  = isDone ? [187, 247, 208] : [253, 230, 138];
        const pillText: [number, number, number] = isDone ? [21, 128, 61]   : [180, 83, 9];

        const w = 22;
        const h = 5.4;
        const pillX = data.cell.x + (data.cell.width - w) / 2;
        const pillY = data.cell.y + (data.cell.height - h) / 2;

        doc.setFillColor(...pillBg);
        doc.setDrawColor(...pillBdr);
        doc.setLineWidth(0.25);
        doc.roundedRect(pillX, pillY, w, h, 2, 2, 'FD');

        // Texto centrado con precisión matemática usando baseline: middle
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...pillText);
        doc.text(text, pillX + w / 2, pillY + h / 2, { align: 'center', baseline: 'middle' });
      }
    }
  });

  // 6. Bloque de Firmas y Validación Pastoral
  const lastAutoTable = (doc as any).lastAutoTable;
  let finalY = lastAutoTable ? lastAutoTable.finalY + 18 : pageHeight - 40;

  // Si no hay suficiente espacio para las firmas, agregar página
  if (finalY + 24 > pageHeight - 16) {
    doc.addPage();
    finalY = 28;
  }

  const signWidth = 65;
  const leftSignX = margin + 6;
  const rightSignX = pageWidth - margin - signWidth - 6;

  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.35);

  // Firma izquierda: Presidencia Congregacional
  doc.line(leftSignX, finalY, leftSignX + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primary);
  doc.text('PRESIDENCIA CONGREGACIONAL', leftSignX + signWidth / 2, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textLight);
  doc.text('Firma y Sello Oficial', leftSignX + signWidth / 2, finalY + 7.5, { align: 'center' });

  // Firma derecha: Secretaría Congregacional
  doc.line(rightSignX, finalY, rightSignX + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primary);
  doc.text('SECRETARÍA CONGREGACIONAL', rightSignX + signWidth / 2, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textLight);
  doc.text('Revisión y Aprobación', rightSignX + signWidth / 2, finalY + 7.5, { align: 'center' });

  // 7. Pie de Página Formal y Paginación (Sin colisiones de texto)
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 7;

    // Fina línea divisoria
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.25);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    // Textos distribuidos con márgenes seguros
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textLight);

    doc.text('Iglesia Cristiana Luterana El Buen Pastor • ICLEB', margin, footerY);
    doc.text('Documento Pastoral Oficial • Uso Interno', pageWidth / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Guardar archivo con nombre descriptivo
  doc.save(`Plan_Actividades_${semFileTag}.pdf`);
}
