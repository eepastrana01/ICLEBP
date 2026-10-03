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

function getCategoriaTexto(actividad: string): string {
  const t = (actividad || '').toLowerCase();
  if (t.includes('aseo') || t.includes('limpieza') || t.includes('mantenimiento') || t.includes('pintura')) return 'Aseo / Mant.';
  if (t.includes('rifa') || t.includes('sorteo') || t.includes('kermesse') || t.includes('venta') || t.includes('fondos') || t.includes('colecta') || t.includes('desayuno')) return 'Pro-Fondos';
  if (t.includes('celebraci') || t.includes('convivio') || t.includes('madre') || t.includes('padre') || t.includes('niño') || t.includes('aniversario') || t.includes('almuerzo')) return 'Celebración';
  if (t.includes('junta') || t.includes('reunión') || t.includes('reunion') || t.includes('asamblea') || t.includes('directiva') || t.includes('comité') || t.includes('comite')) return 'Reunión / Junta';
  if (t.includes('culto') || t.includes('dominical') || t.includes('vigilia') || t.includes('oración') || t.includes('ayuno') || t.includes('santa cena') || t.includes('escuela')) return 'Culto / Liturgia';
  return 'General';
}

export function generarPDFActividades(
  actividades: Actividad[],
  anio: number = new Date().getFullYear(),
  semestre: number | string = 1
) {
  // Hoja en tamaño carta estándar (Letter: 215.9 x 279.4 mm)
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  // Paleta de colores ejecutivos de alto contraste y confort visual (Anti-AI)
  const cTitle: [number, number, number]      = [15, 23, 42];     // Slate-900 (Titular principal)
  const cTextDark: [number, number, number]   = [30, 41, 59];     // Slate-800 (Cuerpo de texto nítido)
  const cTextMuted: [number, number, number]  = [71, 85, 105];    // Slate-600 (Gris lectura confortable)
  const cTextLight: [number, number, number]  = [100, 116, 139];  // Slate-500 (Etiquetas y metadatos)
  const cNavy: [number, number, number]       = [30, 58, 138];    // Blue-900 (Acento institucional sobrio)
  const cBorderLight: [number, number, number]= [226, 232, 240];  // Slate-200 (Separadores finos)
  const cBorderMid: [number, number, number]  = [203, 213, 225];  // Slate-300 (Bordes estructurados)
  const cBgStrip: [number, number, number]    = [248, 250, 252];  // Slate-50 (Franja de síntesis suave)
  const cBgHead: [number, number, number]     = [241, 245, 249];  // Slate-100 (Cabecera de tabla clara)
  const cBgRowAlt: [number, number, number]   = [249, 250, 251];  // Fila alterna sutil
  const cGreenDone: [number, number, number]  = [21, 128, 61];    // Green-700 (Completada sobria)

  // Dimensiones y márgenes
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const usableWidth = pageWidth - margin * 2; // 187.9 mm

  // Determinar texto del período
  const semNum = Number(semestre);
  let periodoTexto = `AÑO ${anio}`;
  let semFileTag = `Anual_${anio}`;
  let periodoCorto = `AÑO ${anio}`;

  if (semNum === 1) {
    periodoTexto = `PRIMER SEMESTRE ${anio} (ENERO – JUNIO)`;
    periodoCorto = `1ER SEMESTRE ${anio}`;
    semFileTag = `1er_Semestre_${anio}`;
  } else if (semNum === 2) {
    periodoTexto = `SEGUNDO SEMESTRE ${anio} (JULIO – DICIEMBRE)`;
    periodoCorto = `2DO SEMESTRE ${anio}`;
    semFileTag = `2do_Semestre_${anio}`;
  } else if (semestre) {
    periodoTexto = `${String(semestre).toUpperCase()} ${anio}`;
    periodoCorto = String(semestre).toUpperCase();
    semFileTag = `${String(semestre).replace(/\s+/g, '_')}_${anio}`;
  }

  // 1. Encabezado Oficial Editorial Compacto
  const logoWidth = 18;
  const logoHeight = 18;
  const logoY = 11;

  try {
    doc.addImage(LOGO_ICLEB_BASE64, 'PNG', margin, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.error('Error insertando logotipo en PDF:', err);
  }

  // Bloque de Control Administrativo a la derecha
  const adminBoxWidth = 46;
  const adminBoxHeight = 17.5;
  const adminBoxX = pageWidth - margin - adminBoxWidth;
  const adminBoxY = logoY;

  doc.setFillColor(...cBgStrip);
  doc.setDrawColor(...cBorderLight);
  doc.setLineWidth(0.25);
  doc.roundedRect(adminBoxX, adminBoxY, adminBoxWidth, adminBoxHeight, 1.5, 1.5, 'FD');

  // Cabecera del cuadro administrativo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(...cTextMuted);
  doc.text('CONTROL ADMINISTRATIVO', adminBoxX + adminBoxWidth / 2, adminBoxY + 3.6, { align: 'center' });

  doc.setDrawColor(...cBorderLight);
  doc.setLineWidth(0.2);
  doc.line(adminBoxX, adminBoxY + 5.0, adminBoxX + adminBoxWidth, adminBoxY + 5.0);

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...cTextDark);
  doc.text(`CÓDIGO: ACT-${anio}-S${semNum || 1}`, adminBoxX + 3.5, adminBoxY + 8.8);
  doc.text(`PERÍODO: ${periodoCorto}`, adminBoxX + 3.5, adminBoxY + 12.4);
  doc.text(`EMISIÓN: ${fechaHoy}`, adminBoxX + 3.5, adminBoxY + 15.8);

  // Textos institucionales centrales
  const headerTextX = margin + logoWidth + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(...cTextLight);
  doc.text('IGLESIA CRISTIANA LUTERANA EL BUEN PASTOR', headerTextX, logoY + 3.5);

  doc.setFontSize(12.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...cTitle);
  doc.text('Plan Pastoral y Agenda de Actividades', headerTextX, logoY + 9.0);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...cTextMuted);
  doc.text('San Pedro Sula, Cortés, Honduras • Colonia Unión', headerTextX, logoY + 13.2);

  doc.setFontSize(7.8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...cNavy);
  doc.text(periodoTexto, headerTextX, logoY + 17.2);

  // Línea divisoria formal
  const dividerY = logoY + 20.5;
  doc.setDrawColor(...cBorderLight);
  doc.setLineWidth(0.25);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // 2. Franja de Síntesis Ejecutiva Horizontal
  const stripY = dividerY + 2.5;
  const stripHeight = 9.8;
  const totalActividades = actividades.length;
  const completadas = actividades.filter(a => a.completado).length;
  const pendientes = totalActividades - completadas;
  const pctCumplimiento = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;

  // Fondo unificado de la franja ejecutiva
  doc.setFillColor(...cBgStrip);
  doc.setDrawColor(...cBorderLight);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, stripY, usableWidth, stripHeight, 1.5, 1.5, 'FD');

  const colW = usableWidth / 4;

  const metricas = [
    { num: `${totalActividades}`, label: 'ACTIVIDADES EN AGENDA', col: cTitle },
    { num: `${completadas}`, label: 'EJECUTADAS / REALIZADAS', col: cGreenDone },
    { num: `${pendientes}`, label: 'PENDIENTES DE EJECUCIÓN', col: cTextDark },
    { num: `${pctCumplimiento}%`, label: 'CUMPLIMIENTO DEL PERÍODO', col: cNavy }
  ];

  metricas.forEach((m, idx) => {
    const colX = margin + idx * colW;
    const colCenter = colX + colW / 2;

    if (idx > 0) {
      doc.setDrawColor(...cBorderLight);
      doc.setLineWidth(0.2);
      doc.line(colX, stripY + 1.8, colX, stripY + stripHeight - 1.8);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(...m.col);
    doc.text(m.num, colCenter, stripY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.6);
    doc.setTextColor(...cTextLight);
    doc.text(m.label, colCenter, stripY + 8.0, { align: 'center' });
  });

  // 3. Preparación de datos ordenados cronológicamente
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
    const fechaTexto = `${capWeekday}, ${day} ${capMonth} ${local.getFullYear()}`;

    const areaTexto = getCategoriaTexto(item.actividad);

    return [
      String(index + 1),
      fechaTexto,
      item.actividad,
      areaTexto,
      item.detalles ? item.detalles.trim() : '—',
      item.completado ? 'Completada' : 'Planificada'
    ];
  });

  // 4. Tabla Editorial Limpia y Optimizada para Evitar Páginas Huérfanas
  autoTable(doc, {
    startY: stripY + stripHeight + 3.5,
    margin: { left: margin, right: margin, top: 12, bottom: 28 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    head: [['N°', 'FECHA Y DÍA', 'ACTIVIDAD / PROGRAMA', 'ÁREA', 'RESPONSABLE / LUGAR / NOTAS', 'ESTADO']],
    body: cuerpoTabla,
    theme: 'plain',
    headStyles: {
      fillColor: cBgHead,
      textColor: cTitle,
      fontStyle: 'bold',
      fontSize: 7.2,
      cellPadding: { top: 2.8, bottom: 2.8, left: 2.5, right: 2.5 },
      valign: 'middle',
      lineWidth: { top: 0.35, bottom: 0.35 },
      lineColor: cBorderMid
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.0,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      valign: 'middle',
      textColor: cTextDark,
      lineWidth: { bottom: 0.15 },
      lineColor: cBorderLight,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: cBgRowAlt
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', textColor: cTextLight, fontStyle: 'bold', fontSize: 7.5 },
      1: { cellWidth: 28, halign: 'left', fontStyle: 'bold', textColor: cTitle, fontSize: 7.8 },
      2: { cellWidth: 53, fontStyle: 'bold', textColor: cTitle, fontSize: 8.0 },
      3: { cellWidth: 26, halign: 'left', fontStyle: 'normal', textColor: cTextMuted, fontSize: 7.5 },
      4: { cellWidth: 50.9, textColor: cTextMuted, fontStyle: 'normal', fontSize: 7.8 },
      5: { cellWidth: 22, halign: 'center' }
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = (data.row.raw as string[])[5];
        const isDone = text === 'Completada';

        const pillBg: [number, number, number]   = isDone ? [240, 253, 244] : [248, 250, 252];
        const pillBdr: [number, number, number]  = isDone ? [187, 247, 208] : [226, 232, 240];
        const pillText: [number, number, number] = isDone ? [21, 128, 61]   : [100, 116, 139];

        const w = 18;
        const h = 4.4;
        const pillX = data.cell.x + (data.cell.width - w) / 2;
        const pillY = data.cell.y + (data.cell.height - h) / 2;

        doc.setFillColor(...pillBg);
        doc.setDrawColor(...pillBdr);
        doc.setLineWidth(0.2);
        doc.roundedRect(pillX, pillY, w, h, 1.2, 1.2, 'FD');

        doc.setFontSize(6.8);
        doc.setFont('helvetica', isDone ? 'bold' : 'normal');
        doc.setTextColor(...pillText);
        doc.text(text, pillX + w / 2, pillY + h / 2, { align: 'center', baseline: 'middle' });
      }
    }
  });

  // 5. Bloque Oficial de Firmas (Integrado siempre con la tabla, sin páginas huérfanas)
  const lastAutoTable = (doc as any).lastAutoTable;
  const tableBottomY = lastAutoTable ? lastAutoTable.finalY : 180;

  // Espacio disponible antes de la línea divisoria del pie de página (270 mm)
  const remainingSpace = (pageHeight - 9.5) - tableBottomY;
  const signSpacing = remainingSpace > 28 ? 10 : (remainingSpace > 19 ? 7 : 5);
  const finalY = tableBottomY + signSpacing;

  const signWidth = 62;
  const leftSignX = margin + 10;
  const rightSignX = pageWidth - margin - signWidth - 10;

  doc.setDrawColor(...cBorderMid);
  doc.setLineWidth(0.3);

  // Firma izquierda: Presidencia Congregacional
  doc.line(leftSignX, finalY, leftSignX + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...cTitle);
  doc.text('PRESIDENCIA CONGREGACIONAL', leftSignX + signWidth / 2, finalY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...cTextLight);
  doc.text('Iglesia Cristiana Luterana El Buen Pastor', leftSignX + signWidth / 2, finalY + 7.2, { align: 'center' });
  doc.text('Firma y Sello Oficial', leftSignX + signWidth / 2, finalY + 10.2, { align: 'center' });

  // Firma derecha: Secretaría Congregacional
  doc.line(rightSignX, finalY, rightSignX + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...cTitle);
  doc.text('SECRETARÍA CONGREGACIONAL', rightSignX + signWidth / 2, finalY + 3.8, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...cTextLight);
  doc.text('Revisión, Registro y Aprobación', rightSignX + signWidth / 2, finalY + 7.2, { align: 'center' });
  doc.text('Fecha: ____/____/________', rightSignX + signWidth / 2, finalY + 10.2, { align: 'center' });

  // 6. Pie de Página Formal y Paginación (Sin colisiones de texto)
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 6;

    // Fina línea divisoria
    doc.setDrawColor(...cBorderLight);
    doc.setLineWidth(0.25);
    doc.line(margin, footerY - 3.5, pageWidth - margin, footerY - 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...cTextLight);

    // Texto izquierdo nítido e institucional
    doc.text('Iglesia Cristiana Luterana El Buen Pastor • Agenda Pastoral', margin, footerY);

    // Numeración a la derecha
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Guardar archivo con nombre descriptivo
  doc.save(`Plan_Actividades_${semFileTag}.pdf`);
}
