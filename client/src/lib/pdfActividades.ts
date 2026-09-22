import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Paleta de colores institucionales de alta gama
  const primary: [number, number, number]    = [15, 23, 42];     // Slate-900 (Titular y encabezados)
  const accent: [number, number, number]     = [79, 70, 229];    // Indigo-600 (Acento institucional)
  const textDark: [number, number, number]   = [15, 23, 42];     // Slate-900 (Texto principal)
  const textMuted: [number, number, number]  = [100, 116, 139];  // Slate-500 (Metadatos)
  const borderCol: [number, number, number]  = [226, 232, 240];  // Slate-200 (Líneas y bordes)
  const bgCard: [number, number, number]     = [255, 255, 255];  // Blanco puro
  const bgRowAlt: [number, number, number]   = [248, 250, 252];  // Slate-50 (Fila alterna)
  const green: [number, number, number]      = [22, 163, 74];    // Green-600
  const amber: [number, number, number]      = [217, 119, 6];    // Amber-600

  // Dimensiones y márgenes optimizados (14 mm a los lados)
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const usableWidth = pageWidth - margin * 2; // 187.9 mm útiles

  // 1. Barra superior de acento institucional
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 3.5, 'F');

  // Determinar texto del período (1er Semestre, 2do Semestre, o texto genérico)
  const semNum = Number(semestre);
  let periodoTexto = `AÑO ${anio}`;
  let semFileTag = `Anual_${anio}`;

  if (semNum === 1) {
    periodoTexto = `1ER SEMESTRE ${anio} (ENERO - JUNIO)`;
    semFileTag = `1er_Semestre_${anio}`;
  } else if (semNum === 2) {
    periodoTexto = `2DO SEMESTRE ${anio} (JULIO - DICIEMBRE)`;
    semFileTag = `2do_Semestre_${anio}`;
  } else if (semestre) {
    periodoTexto = `${String(semestre).toUpperCase()} ${anio}`;
    semFileTag = `${String(semestre).replace(/\s+/g, '_')}_${anio}`;
  }

  // 2. Encabezado institucional de alta densidad (y = 9 a 20 mm)
  let y = 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...primary);
  doc.text('IGLESIA CRISTIANA LUTERANA EL BUEN PASTOR', margin, y);

  y += 4.5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text(`PLAN PASTORAL DE ACTIVIDADES • ${periodoTexto}`, margin, y);

  // Metadatos al lado derecho
  const fechaHoy = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Fecha de Emisión: ${fechaHoy}`, pageWidth - margin, y - 4.5, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Planner Pastoral ICLEB', pageWidth - margin, y, { align: 'right' });

  // Fina línea divisoria
  y += 3.5;
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  // 3. Bloque Compacto de Resumen / KPIs (y = 21.5 a 33 mm)
  y += 3.5;
  const totalActividades = actividades.length;
  const completadas = actividades.filter(a => a.completado).length;
  const pendientes = totalActividades - completadas;
  const pctCumplimiento = totalActividades > 0 ? Math.round((completadas / totalActividades) * 100) : 0;

  const kpis = [
    { label: 'ACTIVIDADES PROGRAMADAS', val: `${totalActividades}`, sub: 'Total en el período', col: primary },
    { label: 'COMPLETADAS', val: `${completadas}`, sub: 'Ejecutadas con éxito', col: green },
    { label: 'PENDIENTES', val: `${pendientes}`, sub: 'Por realizar / En curso', col: amber },
    { label: 'TASA DE CUMPLIMIENTO', val: `${pctCumplimiento}%`, sub: 'Avance global', col: accent }
  ];

  const gap = 2.5;
  const kpiWidth = (usableWidth - gap * (kpis.length - 1)) / kpis.length;
  const kpiHeight = 11.5;

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + gap);

    // Fondo y borde redondeado
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.25);
    doc.roundedRect(kpiX, y, kpiWidth, kpiHeight, 1.5, 1.5, 'FD');

    // Etiqueta superior
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.label, kpiX + 3, y + 3.5);

    // Valor principal
    doc.setFontSize(10.5);
    doc.setTextColor(...kpi.col);
    doc.text(kpi.val, kpiX + 3, y + 8);

    // Subtexto a la derecha o debajo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, kpiX + kpiWidth - 2.5, y + 8, { align: 'right' });
  });

  // 4. Preparación de datos ordenados cronológicamente
  const datosOrdenados = [...actividades].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const cuerpoTabla = datosOrdenados.map((item, index) => {
    const f = new Date(item.fecha);
    const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);

    // Formatear día de la semana y fecha de forma clara y legible
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

  // 5. Tabla de Alta Densidad con jspdf-autotable (startY: ~36 mm)
  autoTable(doc, {
    startY: y + kpiHeight + 3,
    margin: { left: margin, right: margin, top: 10, bottom: 11 },
    pageBreak: 'auto',
    showHead: 'everyPage',
    head: [['N°', 'FECHA PROGRAMADA', 'ACTIVIDAD', 'DETALLES / LUGAR / RESPONSABLE', 'ESTADO']],
    body: cuerpoTabla,
    theme: 'plain',
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: { top: 2.2, bottom: 2.2, left: 2.5, right: 2.5 },
      valign: 'middle',
      lineWidth: 0
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.2,
      cellPadding: { top: 1.7, bottom: 1.7, left: 2.5, right: 2.5 },
      valign: 'middle',
      textColor: textDark,
      lineWidth: 0,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: bgRowAlt
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', textColor: textMuted, fontStyle: 'bold' },
      1: { cellWidth: 26, fontStyle: 'bold', textColor: primary },
      2: { cellWidth: 54, fontStyle: 'bold', textColor: textDark },
      3: { cellWidth: 'auto', textColor: textMuted, fontStyle: 'normal' },
      4: { cellWidth: 24, halign: 'center' }
    },
    // Limpiar el texto de la celda de estado para dibujarlo como píldora personalizada
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.text = [];
      }
    },
    // Dibujar píldora moderna de estado
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = (data.row.raw as string[])[4];
        const isDone = text === 'Completado';

        const pillBg: [number, number, number]    = isDone ? [220, 252, 231] : [241, 245, 249];
        const pillBdr: [number, number, number]   = isDone ? [134, 239, 172] : [203, 213, 225];
        const pillText: [number, number, number]  = isDone ? [22, 163, 74]   : [71, 85, 105];

        const w = 20;
        const h = 4.8;
        const pillX = data.cell.x + (data.cell.width - w) / 2;
        const pillY = data.cell.y + (data.cell.height - h) / 2;

        doc.setFillColor(...pillBg);
        doc.setDrawColor(...pillBdr);
        doc.setLineWidth(0.2);
        doc.roundedRect(pillX, pillY, w, h, 2, 2, 'FD');

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...pillText);
        doc.text(text, pillX + w / 2, pillY + 3.4, { align: 'center' });
      }
    }
  });

  // 6. Pie de Página Institucional y Paginación
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);

    const footerY = pageHeight - 7;

    // Línea divisoria de pie de página
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.2);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    // Texto de pie
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);

    doc.text('Iglesia Cristiana Luterana El Buen Pastor • Planner Pastoral', margin, footerY);
    doc.text('Documento Pastoral Oficial • Uso Interno', pageWidth / 2, footerY, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${i} de ${totalPaginas}`, pageWidth - margin, footerY, { align: 'right' });
  }

  // Guardar archivo con nombre limpio y estructurado
  doc.save(`Plan_Actividades_${semFileTag}.pdf`);
}
