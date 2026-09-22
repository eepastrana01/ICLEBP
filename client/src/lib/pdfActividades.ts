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

  // Paleta de colores institucionales y ejecutivos
  const primary: [number, number, number]    = [15, 23, 42];     // Slate-900 (Titular y texto oscuro)
  const accent: [number, number, number]     = [79, 70, 229];    // Indigo-600 (Acento institucional)
  const textDark: [number, number, number]   = [15, 23, 42];     // Slate-900 (Cuerpo legible)
  const textMuted: [number, number, number]  = [71, 85, 105];    // Slate-600 (Gris oscuro con buen contraste)
  const textLight: [number, number, number]  = [100, 116, 139];  // Slate-500 (Etiquetas secundarias)
  const borderCol: [number, number, number]  = [203, 213, 225];  // Slate-300 (Bordes y cuadrículas)
  const borderLight: [number, number, number]= [226, 232, 240];  // Slate-200 (Separadores suaves)
  const bgCard: [number, number, number]     = [255, 255, 255];  // Blanco puro
  const bgRowAlt: [number, number, number]   = [248, 250, 252];  // Slate-50 (Fila alterna)
  const green: [number, number, number]      = [21, 128, 61];    // Green-700 (Alto contraste para adultos)
  const amber: [number, number, number]      = [180, 83, 9];     // Amber-700 (Alto contraste para adultos)

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

  // 2. Encabezado Oficial Administrativo con Logotipo (y = 9 a 27 mm)
  const logoWidth = 17;
  const logoHeight = 17;
  const logoY = 8.5;

  // Insertar logotipo oficial ICLEB
  try {
    doc.addImage(LOGO_ICLEB_BASE64, 'PNG', margin, logoY, logoWidth, logoHeight);
  } catch (err) {
    console.error('Error insertando logotipo en PDF:', err);
  }

  // Textos institucionales al lado del logo
  const headerTextX = margin + logoWidth + 4;
  let textY = 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(...primary);
  doc.text('IGLESIA CRISTIANA LUTERANA EL BUEN PASTOR', headerTextX, textY);

  textY += 4.8;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text(`PLAN PASTORAL DE ACTIVIDADES • ${periodoTexto}`, headerTextX, textY);

  textY += 4.2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text('Consejo y Administración Pastoral • Sede Central', headerTextX, textY);

  // Cuadro de Control Administrativo a la derecha
  const adminBoxWidth = 50;
  const adminBoxHeight = 18;
  const adminBoxX = pageWidth - margin - adminBoxWidth;
  const adminBoxY = 8.5;

  doc.setFillColor(...bgRowAlt);
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.3);
  doc.roundedRect(adminBoxX, adminBoxY, adminBoxWidth, adminBoxHeight, 1.5, 1.5, 'FD');

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(...textLight);
  doc.text('CONTROL ADMINISTRATIVO', adminBoxX + 3, adminBoxY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...textDark);
  doc.text(`REGISTRO: ACT-${anio}-S${semNum || 1}`, adminBoxX + 3, adminBoxY + 8);
  doc.text(`PERÍODO: ${periodoCorto}`, adminBoxX + 3, adminBoxY + 11.8);
  doc.text(`EMISIÓN: ${fechaHoy}`, adminBoxX + 3, adminBoxY + 15.5);

  // Línea divisoria formal
  const dividerY = adminBoxY + adminBoxHeight + 3.5;
  doc.setDrawColor(...borderLight);
  doc.setLineWidth(0.35);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  // 3. Fila de KPIs Ejecutivos (y = 33.5 a 45.5 mm)
  const kpiY = dividerY + 3;
  const totalActividades = actividades.length;
  const completadas = actividades.filter(a => a.completado).length;
  const pendientes = totalActividades - completadas;
  const pctCumplimiento = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;

  const kpis = [
    { label: 'ACTIVIDADES PROGRAMADAS', val: `${totalActividades}`, sub: 'Total registrado', col: primary },
    { label: 'EJECUTADAS / COMPLETADAS', val: `${completadas}`, sub: 'Realizadas con éxito', col: green },
    { label: 'EN CURSO / PENDIENTES', val: `${pendientes}`, sub: 'Por ejecutar', col: amber },
    { label: 'CUMPLIMIENTO PASTORAL', val: `${pctCumplimiento}%`, sub: 'Meta global', col: accent }
  ];

  const gap = 2.5;
  const kpiWidth = (usableWidth - gap * (kpis.length - 1)) / kpis.length;
  const kpiHeight = 11.5;

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + gap);

    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.25);
    doc.roundedRect(kpiX, kpiY, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    // Etiqueta superior
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(...textLight);
    doc.text(kpi.label, kpiX + 3, kpiY + 3.5);

    // Valor principal en negrita de alta visibilidad
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.col);
    doc.text(kpi.val, kpiX + 3, kpiY + 8);

    // Subtexto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...textLight);
    doc.text(kpi.sub, kpiX + kpiWidth - 2.5, kpiY + 8, { align: 'right' });
  });

  // 4. Preparación de datos ordenados cronológicamente
  const datosOrdenados = [...actividades].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const cuerpoTabla = datosOrdenados.map((item, index) => {
    const f = new Date(item.fecha);
    const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);

    // Día de la semana y fecha con formato nítido y legible
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

  // 5. Tabla Administrativa de Alta Legibilidad (Tamaño de fuente 8.5 pt optimizado para adultos)
  autoTable(doc, {
    startY: kpiY + kpiHeight + 3.5,
    margin: { left: margin, right: margin, top: 12, bottom: 22 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    head: [['N°', 'FECHA PROGRAMADA', 'ACTIVIDAD PASTORAL', 'DETALLES / LUGAR / RESPONSABLE', 'ESTADO']],
    body: cuerpoTabla,
    theme: 'plain',
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      valign: 'middle',
      lineWidth: 0
    },
    styles: {
      font: 'helvetica',
      fontSize: 8.5, // Mayor tamaño de fuente para lectura clara de personas adultas
      cellPadding: { top: 2.5, bottom: 2.5, left: 2.8, right: 2.8 },
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
      0: { cellWidth: 8.5, halign: 'center', textColor: textLight, fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 28, fontStyle: 'bold', textColor: primary, fontSize: 8.5 },
      2: { cellWidth: 56, fontStyle: 'bold', textColor: textDark, fontSize: 8.5 },
      3: { cellWidth: 'auto', textColor: textMuted, fontStyle: 'normal', fontSize: 8 },
      4: { cellWidth: 24, halign: 'center' }
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

        const pillBg: [number, number, number]    = isDone ? [220, 252, 231] : [241, 245, 249];
        const pillBdr: [number, number, number]   = isDone ? [134, 239, 172] : [203, 213, 225];
        const pillText: [number, number, number]  = isDone ? [21, 128, 61]   : [71, 85, 105];

        const w = 21;
        const h = 5.2;
        const pillX = data.cell.x + (data.cell.width - w) / 2;
        const pillY = data.cell.y + (data.cell.height - h) / 2;

        doc.setFillColor(...pillBg);
        doc.setDrawColor(...pillBdr);
        doc.setLineWidth(0.25);
        doc.roundedRect(pillX, pillY, w, h, 2, 2, 'FD');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...pillText);
        doc.text(text, pillX + w / 2, pillY + 3.7, { align: 'center' });
      }
    }
  });

  // 6. Bloque de Firmas y Validación Pastoral
  const lastAutoTable = (doc as any).lastAutoTable;
  let finalY = lastAutoTable ? lastAutoTable.finalY + 12 : pageHeight - 40;

  // Si no hay suficiente espacio para las firmas, agregar página
  if (finalY + 24 > pageHeight - 14) {
    doc.addPage();
    finalY = 22;
  }

  const signWidth = 60;
  const leftSignX = margin + 15;
  const rightSignX = pageWidth - margin - signWidth - 15;

  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.35);

  // Firma izquierda
  doc.line(leftSignX, finalY, leftSignX + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primary);
  doc.text('PASTOR TITULAR / MINISTRO', leftSignX + signWidth / 2, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textLight);
  doc.text('Firma y Sello Pastoral', leftSignX + signWidth / 2, finalY + 7.5, { align: 'center' });

  // Firma derecha
  doc.line(rightSignX, finalY, rightSignX + signWidth, finalY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primary);
  doc.text('SECRETARÍA / CONSEJO PASTORAL', rightSignX + signWidth / 2, finalY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...textLight);
  doc.text('Revisión y Aprobación', rightSignX + signWidth / 2, finalY + 7.5, { align: 'center' });

  // 7. Pie de Página Institucional y Paginación
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 7;

    // Fina línea divisoria
    doc.setDrawColor(...borderLight);
    doc.setLineWidth(0.25);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    // Texto de pie
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textLight);

    doc.text('Iglesia Cristiana Luterana El Buen Pastor • Planner Pastoral ICLEB', margin, footerY);
    doc.text('Documento Administrativo Oficial • Uso Pastoral Interno', pageWidth / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Guardar archivo
  doc.save(`Plan_Actividades_${semFileTag}.pdf`);
}
