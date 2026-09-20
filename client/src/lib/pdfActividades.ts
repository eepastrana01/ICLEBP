import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Actividad {
  id: number;
  fecha: string;
  actividad: string;
  detalles: string;
  completado: boolean;
}

const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export function generarPDFActividades(actividades: Actividad[], mes: number, anio: number) {
  const doc = new jsPDF({ format: 'letter' });

  // --- COLORES (idénticos al original) ---
  const primary: [number, number, number]    = [79, 70, 229];   // Indigo-600
  const textMain: [number, number, number]   = [15, 23, 42];    // Slate-900
  const textMuted: [number, number, number]  = [100, 116, 139]; // Slate-500
  const border: [number, number, number]     = [226, 232, 240]; // Slate-200
  const green: [number, number, number]      = [22, 163, 74];   // Green-600
  const orange: [number, number, number]     = [234, 88, 12];   // Orange-600

  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;

  // --- ENCABEZADO ---
  // Barra accent superior
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 6, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...textMain);
  doc.text('Plan de Actividades', margin, 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...textMuted);
  doc.text('El Buen Pastor - Iglesia Cristiana Luterana', margin, 28);

  const fechaImpresion = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const periodoTexto = `${monthNames[mes]} ${anio}`;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primary);
  doc.text(periodoTexto.toUpperCase(), pageWidth - margin, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Generado: ${fechaImpresion}`, pageWidth - margin, 28, { align: 'right' });

  // Línea divisoria
  doc.setDrawColor(...border);
  doc.setLineWidth(0.5);
  doc.line(margin, 34, pageWidth - margin, 34);

  // --- KPIs ---
  const total       = actividades.length;
  const completadas = actividades.filter(a => a.completado).length;
  const pendientes  = total - completadas;
  const startY = 40;

  const drawKpi = (x: number, label: string, value: number, color: [number,number,number]) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...border);
    doc.roundedRect(x, startY, 45, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textMuted);
    doc.text(label.toUpperCase(), x + 4, startY + 6);
    doc.setFontSize(14);
    doc.setTextColor(...color);
    doc.text(String(value), x + 4, startY + 14);
  };

  drawKpi(margin,      'Total',       total,       primary);
  drawKpi(margin + 50, 'Completadas', completadas, green);
  drawKpi(margin + 100,'Pendientes',  pendientes,  orange);

  // --- TABLA ---
  const datosOrdenados = [...actividades].sort(
    (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
  );

  const cuerpoTabla = datosOrdenados.map(item => {
    const f = new Date(item.fecha);
    const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    const fechaTexto = fUser.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
    return [
      fechaTexto,
      item.actividad,
      item.detalles || '-',
      item.completado ? 'Completado' : 'Pendiente',
    ];
  });

  autoTable(doc, {
    startY: 66,
    head: [['FECHA', 'ACTIVIDAD', 'DETALLES', 'ESTADO']],
    body: cuerpoTabla,
    theme: 'plain',
    headStyles: {
      fillColor: primary,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
      fontSize: 8,
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
      valign: 'middle',
      textColor: textMain,
      lineWidth: 0,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] as [number,number,number] },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'normal', textColor: textMuted },
      1: { cellWidth: 55, fontStyle: 'bold',   textColor: textMain  },
      2: { cellWidth: 'auto', textColor: textMuted },
      3: { cellWidth: 32, halign: 'center' },
    },
    willDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const text = (data.row.raw as string[])[3];
        const isDone = text === 'Completado';
        const pillColor: [number,number,number]  = isDone ? [220,252,231] : [241,245,249];
        const textColor: [number,number,number]  = isDone ? [22,163,74]   : [71,85,105];
        const bdrColor:  [number,number,number]  = isDone ? [134,239,172] : [203,213,225];
        const w = 24, h = 6.5;
        const x = data.cell.x + data.cell.width / 2 - w / 2;
        const y = data.cell.y + data.cell.height / 2 - h / 2;
        doc.setFillColor(...pillColor);
        doc.setDrawColor(...bdrColor);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, y, w, h, 3, 3, 'FD');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textColor);
        doc.text(text, x + w / 2, y + 4.5, { align: 'center' });
      }
    },
  });

  // --- PIE DE PÁGINA ---
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...textMuted);
    doc.text('Sistema de Planificación - Uso interno', margin, doc.internal.pageSize.height - margin);
    doc.text(`Página ${i} de ${paginas}`, pageWidth - margin, doc.internal.pageSize.height - margin, { align: 'right' });
  }

  doc.save(`Planner_${monthNames[mes]}_${anio}.pdf`);
}
