import jsPDF from 'jspdf';
import { LOGO_ICLEB_BASE64 } from './logoBase64';

export interface BautismoPDFData {
  numero_registro: string;
  nombre_persona: string;
  genero: 'M' | 'F' | string;
  fecha_nacimiento: string | Date;
  lugar_nacimiento: string;
  padre?: string | null;
  madre?: string | null;
  padrinos?: string | null;
  fecha_bautismo: string | Date;
  pastor_oficiante: string;
  lugar_bautismo?: string | null;
  es_reposicion?: boolean;
  nota_reposicion?: string | null;
}

function formatearFechaEspanol(fechaStr: string | Date): string {
  if (!fechaStr) return '';
  const d = new Date(fechaStr);
  const local = new Date(d.getTime() + d.getTimezoneOffset() * 60000);
  const dia = local.getDate();
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[local.getMonth()];
  const anio = local.getFullYear();
  return `${dia} de ${mes} de ${anio}`;
}

export function generarPDFBautismo(data: BautismoPDFData): void {
  // Hoja en tamaño carta vertical (Letter: 215.9 x 279.4 mm)
  const doc = new jsPDF({ format: 'letter', unit: 'mm', orientation: 'portrait' });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Paleta de colores eclesiales y solemnes
  const primary: [number, number, number]   = [15, 23, 42];     // Slate-900
  const gold: [number, number, number]      = [180, 130, 40];   // Regal Gold
  const goldLight: [number, number, number] = [245, 238, 220];  // Soft Gold Tint
  const textDark: [number, number, number]  = [30, 41, 59];     // Slate-800
  const textMuted: [number, number, number] = [100, 116, 139];  // Slate-500
  const borderCol: [number, number, number] = [226, 232, 240];  // Slate-200
  const bgCard: [number, number, number]    = [248, 250, 252];  // Slate-50

  const isFemenino = data.genero === 'F';
  const hijoTexto = isFemenino ? 'Hija' : 'Hijo';
  const herederoTexto = isFemenino ? 'Heredera' : 'Heredero';
  const hechoTexto = isFemenino ? 'hecha' : 'hecho';

  // 1. Doble Marco Ornamental Ceremonial
  // Marco exterior
  doc.setDrawColor(...primary);
  doc.setLineWidth(0.8);
  doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 3, 3, 'D');

  // Marco interior dorado
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.4);
  doc.rect(14.5, 14.5, pageWidth - 29, pageHeight - 29, 'D');

  // Adornos finos en las 4 esquinas del marco interior
  const cornerSize = 4;
  const drawCorner = (cx: number, cy: number, dx: number, dy: number) => {
    doc.line(cx, cy, cx + dx * cornerSize, cy);
    doc.line(cx, cy, cx, cy + dy * cornerSize);
  };
  doc.setLineWidth(0.5);
  doc.setDrawColor(...gold);
  drawCorner(16.5, 16.5, 1, 1);
  drawCorner(pageWidth - 16.5, 16.5, -1, 1);
  drawCorner(16.5, pageHeight - 16.5, 1, -1);
  drawCorner(pageWidth - 16.5, pageHeight - 16.5, -1, -1);

  // 2. Logotipo Oficial Centrado (Rosa de Lutero con arco circular)
  const logoW = 21;
  const logoH = 21;
  const logoX = (pageWidth - logoW) / 2;
  const logoY = 17;

  try {
    doc.addImage(LOGO_ICLEB_BASE64, 'PNG', logoX, logoY, logoW, logoH);
  } catch (err) {
    console.warn('No se pudo cargar el logo base64:', err);
  }

  // 3. Encabezado Institucional
  let curY = logoY + logoH + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...primary);
  doc.text('IGLESIA CRISTIANA LUTERANA EL BUEN PASTOR', pageWidth / 2, curY, { align: 'center' });

  curY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...gold);
  doc.text('SAN PEDRO SULA, HONDURAS, C.A.', pageWidth / 2, curY, { align: 'center' });

  // 4. Título Solemne del Sacramento
  curY += 8.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...primary);
  doc.text('FE DE BAUTISMO', pageWidth / 2, curY, { align: 'center' });

  // Línea divisoria ceremonial con rombo central
  curY += 3;
  const lineHalfW = 40;
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(pageWidth / 2 - lineHalfW, curY, pageWidth / 2 - 4, curY);
  doc.line(pageWidth / 2 + 4, curY, pageWidth / 2 + lineHalfW, curY);
  // Pequeño rombo central dorado
  doc.setFillColor(...gold);
  doc.rect(pageWidth / 2 - 1.5, curY - 1.5, 3, 3, 'F');

  // 5. Citas Sagradas de las Sagradas Escrituras (Word original: Mateo 28:18-20 y Juan 3:5)
  curY += 4;
  const bibleBoxW = 168;
  const bibleBoxH = 21;
  const bibleBoxX = (pageWidth - bibleBoxW) / 2;
  
  doc.setFillColor(...bgCard);
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.3);
  doc.roundedRect(bibleBoxX, curY, bibleBoxW, bibleBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.8);
  doc.setTextColor(...textDark);
  
  const textMateo = '«Jesús se acercó a ellos y les dijo: -Dios me ha dado toda autoridad en el cielo y en la tierra. Vayan, pues, a las gentes de todas las naciones, y háganlas mis discípulos; bautícenlas en el nombre del Padre, del Hijo y del Espíritu Santo, y enséñenles a obedecer todo lo que les he mandado a ustedes. Por mi parte, yo estaré con ustedes todos los días, hasta el fin del mundo. San Mateo 28:18-20»';
  const textJuan = '«El que no naciere de agua y del Espíritu, no puede entrar en el reino de Dios. San Juan 3:5»';
  
  const mateoLines = doc.splitTextToSize(textMateo, bibleBoxW - 8);
  doc.text(mateoLines, pageWidth / 2, curY + 4, { align: 'center' });

  doc.setFont('helvetica', 'bolditalic');
  doc.text(textJuan, pageWidth / 2, curY + 17.5, { align: 'center' });

  // 6. Fórmula Teológica y Sacramental Luterana
  curY += bibleBoxH + 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...primary);

  const formulaTexto = `En la Iglesia Cristiana Luterana El Buen Pastor, de San Pedro Sula, Cortés, Honduras;\nen el nombre del PADRE, y del HIJO, y del ESPÍRITU SANTO. Por medio de este SANTO SACRAMENTO,\nha recibido el perdón de sus pecados, ha sido ${hechoTexto} ${hijoTexto} de Dios y ${herederoTexto} de la vida eterna. Damos fe:`;
  const formulaLines = doc.splitTextToSize(formulaTexto, 166);
  doc.text(formulaLines, pageWidth / 2, curY, { align: 'center', lineHeightFactor: 1.35 });

  // 7. Nombre de la Persona Bautizada (Destacado y prominente)
  curY += 15;
  const nameCardW = 168;
  const nameCardH = 12;
  const nameCardX = (pageWidth - nameCardW) / 2;

  doc.setFillColor(...goldLight);
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.4);
  doc.roundedRect(nameCardX, curY, nameCardW, nameCardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...primary);
  doc.text(data.nombre_persona.toUpperCase(), pageWidth / 2, curY + 7.8, { align: 'center' });

  // 8. Ficha Genealógica y Sacramental
  curY += nameCardH + 6.5;

  const fechaNac = formatearFechaEspanol(data.fecha_nacimiento);
  const fechaBaut = formatearFechaEspanol(data.fecha_bautismo);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(...textDark);

  // Línea 1: Nacimiento
  doc.text(`Que nació el día ${fechaNac}, en la ciudad de ${data.lugar_nacimiento}.`, pageWidth / 2, curY, { align: 'center' });

  // Línea 2: Padres
  curY += 5.5;
  let padresTexto = '';
  if (data.padre && data.madre) {
    padresTexto = `${data.padre} y ${data.madre}`;
  } else if (data.padre) {
    padresTexto = `${data.padre}`;
  } else if (data.madre) {
    padresTexto = `${data.madre}`;
  } else {
    padresTexto = 'Padres no consignados';
  }
  doc.text(`${hijoTexto} de: `, pageWidth / 2 - 25, curY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(padresTexto, pageWidth / 2 - 24, curY, { align: 'left' });

  // Línea 3: Padrinos (si existen)
  if (data.padrinos && data.padrinos.trim()) {
    curY += 5.5;
    doc.setFont('helvetica', 'normal');
    doc.text('Padrinos / Testigos: ', pageWidth / 2 - 25, curY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(data.padrinos.trim(), pageWidth / 2 - 24, curY, { align: 'left' });
  }

  // Línea 4: Fecha del Bautismo
  curY += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`El día ${fechaBaut}, fue ${hechoTexto} ${hijoTexto.toLowerCase()} de Dios, por el:`, pageWidth / 2, curY, { align: 'center' });

  curY += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...gold);
  doc.text('SANTO BAUTISMO', pageWidth / 2, curY, { align: 'center' });

  // Lugar del Bautismo
  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...textMuted);
  const lugarBaut = data.lugar_bautismo || 'Iglesia Cristiana Luterana El Buen Pastor, San Pedro Sula';
  doc.text(`Administrado en: ${lugarBaut}`, pageWidth / 2, curY, { align: 'center' });

  // 9. Bloque de Reposición Histórica (si aplica)
  if (data.es_reposicion) {
    curY += 6;
    const repoBoxW = 168;
    const repoBoxH = 9.5;
    const repoBoxX = (pageWidth - repoBoxW) / 2;

    doc.setFillColor(254, 252, 232); // Amber-50
    doc.setDrawColor(245, 158, 11);  // Amber-500
    doc.setLineWidth(0.3);
    doc.roundedRect(repoBoxX, curY, repoBoxW, repoBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('REPOSICIÓN DE FE DE BAUTISMO', pageWidth / 2, curY + 3.8, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...textDark);
    const notaTexto = data.nota_reposicion || 'Acta expedida conforme a los archivos parroquiales eclesiales.';
    doc.text(notaTexto, pageWidth / 2, curY + 7.5, { align: 'center' });
    curY += repoBoxH;
  }

  // 10. Metadatos de Control Parroquial (N° Registro y Fecha de Emisión)
  const metaY = Math.max(curY + 7, 218);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primary);
  doc.text(`N° REGISTRO: ${data.numero_registro}`, 24, metaY);

  const fechaHoy = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...textMuted);
  doc.text(`Emisión: ${fechaHoy}`, pageWidth - 24, metaY, { align: 'right' });

  // 11. Bloque de Firmas y Validación Pastoral
  const signY = metaY + 19;
  const signWidth = 64;
  const leftSignX = 26;
  const rightSignX = pageWidth - 26 - signWidth;

  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.35);

  // Firma izquierda: Pastor Oficiante
  doc.line(leftSignX, signY, leftSignX + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...primary);
  doc.text(data.pastor_oficiante.toUpperCase(), leftSignX + signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...textMuted);
  doc.text('Pastor Oficiante / Ministro', leftSignX + signWidth / 2, signY + 7.5, { align: 'center' });

  // Firma derecha: Secretaría / Presidencia
  doc.line(rightSignX, signY, rightSignX + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(...primary);
  doc.text('PRESIDENCIA / SECRETARÍA', rightSignX + signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...textMuted);
  doc.text('Firma y Sello Oficial', rightSignX + signWidth / 2, signY + 7.5, { align: 'center' });

  // 12. Pie de Documento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(...textMuted);
  doc.text('Documento Canónico Oficial • Iglesia Cristiana Luterana El Buen Pastor • ICLEB', pageWidth / 2, pageHeight - 16.5, { align: 'center' });

  // Descargar archivo
  const cleanName = data.nombre_persona.replace(/\s+/g, '_');
  doc.save(`Fe_de_Bautismo_${cleanName}_Reg${data.numero_registro}.pdf`);
}
