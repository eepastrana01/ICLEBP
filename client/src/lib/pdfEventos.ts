import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface EventoPDFData {
  id: number;
  nombre: string;
  descripcion?: string | null;
  tipo: string;
  precio_boleto: number;
  fecha_evento?: string | null;
  meta_recaudacion?: number | null;
  resumen?: {
    total_participantes: number;
    total_boletos: number;
    total_recaudado: number;
    total_pendiente: number;
    total_proyectado: number;
    boletos_entregados: number;
    boletos_no_entregados: number;
    porcentaje_recaudado: number;
    porcentaje_entregado: number;
  };
}

export interface ParticipantePDFData {
  id: number;
  nombre_persona: string;
  telefono?: string | null;
  cantidad_boletos: number;
  numeros_boletos?: string | null;
  monto_total: number;
  pagado: boolean;
  entregado: boolean;
  notas?: string | null;
}

export function generarPDFEvento(evento: EventoPDFData, participantes: ParticipantePDFData[]) {
  // Hoja en tamaño carta (Letter: 215.9 x 279.4 mm)
  const doc = new jsPDF({ format: 'letter', unit: 'mm' });

  // Paleta de colores institucionales
  const primary: [number, number, number]   = [15, 23, 42];     // Slate-900 (Elegante)
  const accent: [number, number, number]    = [79, 70, 229];    // Indigo-600
  const textDark: [number, number, number]  = [15, 23, 42];     // Slate-900
  const textMuted: [number, number, number] = [100, 116, 139];  // Slate-500
  const borderCol: [number, number, number] = [226, 232, 240];  // Slate-200
  const bgCard: [number, number, number]    = [248, 250, 252];  // Slate-50

  // Márgenes macizos y consistentes (18 mm)
  const margin = 18;
  const pageWidth = doc.internal.pageSize.width;
  const usableWidth = pageWidth - margin * 2;

  // 1. Barra de acento superior institucional
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // 2. Encabezado del documento
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...textDark);
  doc.text('IGLESIA CRISTIANA LUTERANA EL BUEN PASTOR', margin, y);

  y += 5.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accent);
  doc.text('CONTROL OFICIAL DE ACTIVIDAD & RECAUDACIÓN', margin, y);

  // Fecha de emisión al lado derecho
  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);
  doc.text(`Fecha de Emisión: ${fechaHoy}`, pageWidth - margin, y - 5.5, { align: 'right' });
  doc.text(`Sistema Planner Pastoral`, pageWidth - margin, y, { align: 'right' });

  // Línea divisoria elegante
  y += 4;
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  // 3. Ficha de Datos del Evento
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...textDark);
  doc.text(evento.nombre.toUpperCase(), margin, y);

  y += 5;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...textMuted);

  const tipoTexto = evento.tipo === 'rifa' ? 'Rifa Congregacional' : evento.tipo === 'subasta' ? 'Subasta de Bienes' : 'Actividad Especial';
  const precioTexto = `Precio por Boleto: L. ${Number(evento.precio_boleto || 0).toFixed(2)}`;
  const metaTexto = evento.meta_recaudacion ? ` | Meta Proyectada: L. ${Number(evento.meta_recaudacion).toFixed(2)}` : '';
  
  let fechaEventoTexto = '';
  if (evento.fecha_evento) {
    const f = new Date(evento.fecha_evento);
    const local = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    fechaEventoTexto = ` | Fecha Programada: ${local.toLocaleDateString('es-HN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }

  doc.text(`Tipo: ${tipoTexto} | ${precioTexto}${metaTexto}${fechaEventoTexto}`, margin, y);

  // 4. Bloque Resumen Ejecutivo / KPIs (Cajas compactas con bordes definidos)
  y += 6;
  const resumen = evento.resumen || {
    total_participantes: participantes.length,
    total_boletos: participantes.reduce((acc, p) => acc + (p.cantidad_boletos || 0), 0),
    total_recaudado: participantes.filter(p => p.pagado).reduce((acc, p) => acc + (p.monto_total || 0), 0),
    total_pendiente: participantes.filter(p => !p.pagado).reduce((acc, p) => acc + (p.monto_total || 0), 0),
    total_proyectado: participantes.reduce((acc, p) => acc + (p.monto_total || 0), 0),
    boletos_entregados: participantes.filter(p => p.entregado).reduce((acc, p) => acc + (p.cantidad_boletos || 0), 0),
    boletos_no_entregados: 0,
    porcentaje_recaudado: 0,
    porcentaje_entregado: 0
  };

  const kpis = [
    { label: 'PARTICIPANTES', val: `${resumen.total_participantes}`, sub: 'Personas' },
    { label: 'BOLETOS ASIGNADOS', val: `${resumen.total_boletos}`, sub: `${resumen.boletos_entregados} entregados` },
    { label: 'TOTAL COBRADO', val: `L. ${Number(resumen.total_recaudado).toFixed(2)}`, sub: 'Efectivo pagado', highlight: 'emerald' },
    { label: 'TOTAL PENDIENTE', val: `L. ${Number(resumen.total_pendiente).toFixed(2)}`, sub: 'Por cobrar', highlight: 'amber' },
    { label: 'TOTAL PROYECTADO', val: `L. ${Number(resumen.total_proyectado).toFixed(2)}`, sub: 'Valor total' }
  ];

  const kpiCount = kpis.length;
  const gap = 2.5;
  const kpiWidth = (usableWidth - gap * (kpiCount - 1)) / kpiCount;
  const kpiHeight = 15;

  kpis.forEach((kpi, idx) => {
    const kpiX = margin + idx * (kpiWidth + gap);
    
    // Fondo de la tarjeta
    doc.setFillColor(...bgCard);
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.3);
    doc.roundedRect(kpiX, y, kpiWidth, kpiHeight, 2, 2, 'FD');

    // Título / Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.label, kpiX + kpiWidth / 2, y + 4, { align: 'center' });

    // Valor principal
    doc.setFontSize(9);
    if (kpi.highlight === 'emerald') {
      doc.setTextColor(5, 150, 105); // Emerald-600
    } else if (kpi.highlight === 'amber') {
      doc.setTextColor(217, 119, 6); // Amber-600
    } else {
      doc.setTextColor(...primary);
    }
    doc.text(kpi.val, kpiX + kpiWidth / 2, y + 9.5, { align: 'center' });

    // Subtexto
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...textMuted);
    doc.text(kpi.sub, kpiX + kpiWidth / 2, y + 13.5, { align: 'center' });
  });

  y += kpiHeight + 6;

  // 5. Tabla de Participantes con jspdf-autotable
  const tableData = participantes.map((p, index) => {
    const totalFila = `L. ${Number(p.monto_total || 0).toFixed(2)}`;
    const estadoPago = p.pagado ? 'PAGADO' : 'PENDIENTE';
    const estadoEntrega = p.entregado ? 'ENTREGADO' : 'PENDIENTE';
    const nums = p.numeros_boletos ? p.numeros_boletos : '-';

    return [
      String(index + 1),
      p.nombre_persona,
      String(p.cantidad_boletos || 1),
      nums,
      totalFila,
      estadoPago,
      estadoEntrega,
      '' // Columna para firma física
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [[
      '#',
      'PARTICIPANTE / COMPRADOR',
      'CANT.',
      'NÚMEROS',
      'TOTAL',
      'PAGO',
      'ENTREGA',
      'FIRMA DE CONFORMIDAD'
    ]],
    body: tableData.length > 0 ? tableData : [['-', 'No hay participantes registrados todavía.', '-', '-', '-', '-', '-', '']],
    theme: 'plain',
    headStyles: {
      fillColor: primary,
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 2.8,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 46, fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 20, halign: 'center', textColor: textMuted },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 25, halign: 'center' },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: textDark,
      lineColor: borderCol,
      lineWidth: 0.2,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [252, 253, 255],
    },
    didDrawCell: (data) => {
      // Dibujar badges estilizados para PAGADO / PENDIENTE en la columna 5
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text === 'PAGADO') {
          data.cell.text = [];
          const w = 18, h = 4.8;
          const cx = data.cell.x + data.cell.width / 2 - w / 2;
          const cy = data.cell.y + data.cell.height / 2 - h / 2;
          doc.setFillColor(236, 253, 245); // Emerald-50
          doc.setDrawColor(167, 243, 208); // Emerald-200
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, w, h, 1.5, 1.5, 'FD');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(5, 150, 105); // Emerald-600
          doc.text('PAGADO', cx + w / 2, cy + 3.4, { align: 'center' });
        } else if (text === 'PENDIENTE') {
          data.cell.text = [];
          const w = 18, h = 4.8;
          const cx = data.cell.x + data.cell.width / 2 - w / 2;
          const cy = data.cell.y + data.cell.height / 2 - h / 2;
          doc.setFillColor(254, 242, 242); // Rose-50
          doc.setDrawColor(254, 205, 211); // Rose-200
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, w, h, 1.5, 1.5, 'FD');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(225, 29, 72); // Rose-600
          doc.text('PENDIENTE', cx + w / 2, cy + 3.4, { align: 'center' });
        }
      }

      // Dibujar badges para ENTREGADO / PENDIENTE en la columna 6
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw);
        if (text === 'ENTREGADO') {
          data.cell.text = [];
          const w = 19, h = 4.8;
          const cx = data.cell.x + data.cell.width / 2 - w / 2;
          const cy = data.cell.y + data.cell.height / 2 - h / 2;
          doc.setFillColor(240, 249, 255); // Sky-50
          doc.setDrawColor(186, 230, 253); // Sky-200
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, w, h, 1.5, 1.5, 'FD');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(2, 132, 199); // Sky-600
          doc.text('ENTREGADO', cx + w / 2, cy + 3.4, { align: 'center' });
        } else if (text === 'PENDIENTE') {
          data.cell.text = [];
          const w = 19, h = 4.8;
          const cx = data.cell.x + data.cell.width / 2 - w / 2;
          const cy = data.cell.y + data.cell.height / 2 - h / 2;
          doc.setFillColor(241, 245, 249); // Slate-100
          doc.setDrawColor(226, 232, 240); // Slate-200
          doc.setLineWidth(0.2);
          doc.roundedRect(cx, cy, w, h, 1.5, 1.5, 'FD');
          doc.setFontSize(6.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(100, 116, 139); // Slate-500
          doc.text('PENDIENTE', cx + w / 2, cy + 3.4, { align: 'center' });
        }
      }

      // Columna de firma física: línea de puntos sutil para firmar
      if (data.section === 'body' && data.column.index === 7) {
        const lx1 = data.cell.x + 2;
        const lx2 = data.cell.x + data.cell.width - 2;
        const ly = data.cell.y + data.cell.height - 2.5;
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.setLineWidth(0.3);
        doc.line(lx1, ly, lx2, ly);
      }
    }
  });

  // 6. Pie de Página en todas las hojas
  const totalPaginas = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;

  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    
    // Línea divisoria de pie de página
    doc.setDrawColor(...borderCol);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.text(
      'Documento oficial generado para el control y auditoría pastoral - Iglesia El Buen Pastor',
      margin,
      pageHeight - 7.5
    );
    doc.text(
      `Página ${i} de ${totalPaginas}`,
      pageWidth - margin,
      pageHeight - 7.5,
      { align: 'right' }
    );
  }

  // Guardar archivo con nombre limpio y descriptivo
  const nombreLimpio = evento.nombre.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Actividad_${nombreLimpio}_${new Date().toISOString().split('T')[0]}.pdf`);
}
