import jsPDF from 'jspdf';
import {
  LUTHER_ROSE_DOCX_BASE64,
  VIVALDI_FONT_BASE64,
  CORSIVA_FONT_BASE64,
  GOUDY_REGULAR_BASE64,
  GOUDY_BOLD_BASE64
} from './bautismoFonts';

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
  const diaNum = local.getDate();
  const dia = diaNum < 10 ? `0${diaNum}` : `${diaNum}`;
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const mes = meses[local.getMonth()];
  const anio = local.getFullYear();
  return `${dia} de ${mes} de ${anio}`;
}

/**
 * Dibuja una línea de texto perfectamente justificada de x1 a x2
 */
function drawJustifiedLine(doc: jsPDF, line: string, x1: number, x2: number, y: number) {
  const words = line.trim().split(/\s+/);
  if (words.length <= 1) {
    doc.text(line, x1, y);
    return;
  }
  const totalWordsWidth = words.reduce((sum, w) => sum + doc.getTextWidth(w), 0);
  const targetWidth = x2 - x1;
  const wordSpacing = (targetWidth - totalWordsWidth) / (words.length - 1);

  let currentX = x1;
  for (let i = 0; i < words.length; i++) {
    doc.text(words[i], currentX, y);
    currentX += doc.getTextWidth(words[i]) + wordSpacing;
  }
}

export function generarPDFBautismo(data: BautismoPDFData): void {
  // Hoja en tamaño carta vertical (Letter: 215.9 x 279.4 mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter',
    compress: true
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Registrar fuentes originales del documento canónico Word
  doc.addFileToVFS('Vivaldi.ttf', VIVALDI_FONT_BASE64);
  doc.addFont('Vivaldi.ttf', 'Vivaldi', 'normal');
  doc.addFont('Vivaldi.ttf', 'Vivaldi', 'bold');

  doc.addFileToVFS('Corsiva.ttf', CORSIVA_FONT_BASE64);
  doc.addFont('Corsiva.ttf', 'Corsiva', 'normal');
  doc.addFont('Corsiva.ttf', 'Corsiva', 'bold');

  doc.addFileToVFS('Goudy-Regular.ttf', GOUDY_REGULAR_BASE64);
  doc.addFont('Goudy-Regular.ttf', 'Goudy', 'normal');

  doc.addFileToVFS('Goudy-Bold.ttf', GOUDY_BOLD_BASE64);
  doc.addFont('Goudy-Bold.ttf', 'Goudy', 'bold');

  const isFemenino = data.genero === 'F';
  const hijoTexto = isFemenino ? 'Hija' : 'Hijo';
  const herederoTexto = isFemenino ? 'Heredera' : 'Heredero';
  const hechoTexto = isFemenino ? 'hecha' : 'hecho';

  // 2. Marco exterior simple negro (idéntico al documento Word original)
  const margin = 12;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'D');

  // 3. Emblema Rosa de Lutero original del docx
  const logoW = 31;
  const logoH = 31;
  const logoX = (pageWidth - logoW) / 2;
  const logoY = 16;
  doc.addImage(LUTHER_ROSE_DOCX_BASE64, 'PNG', logoX, logoY, logoW, logoH);

  // 4. Título "Fe de Bautismo" en fuente Vivaldi (36pt)
  doc.setFont('Vivaldi', 'bold');
  doc.setFontSize(36);
  doc.setTextColor(0, 0, 0);
  doc.text('Fe de Bautismo', pageWidth / 2, 57, { align: 'center' });

  // 5. Citas Bíblicas en Goudy Old Style (12pt, texto justificado fiel al original)
  const boxLeft = 16;
  const boxRight = pageWidth - 16;

  doc.setFont('Goudy', 'normal');
  doc.setFontSize(12);

  let yText = 69;
  drawJustifiedLine(
    doc,
    'Jesús se acercó a ellos y les dijo: –Dios me ha dado toda autoridad en el cielo y en la tierra. Vayan, pues, a las',
    boxLeft,
    boxRight,
    yText
  );
  yText += 4.5;

  drawJustifiedLine(
    doc,
    'gentes de todas las naciones, y háganlas mis discípulos; bautícenlas en el nombre del Padre, del Hijo y del',
    boxLeft,
    boxRight,
    yText
  );
  yText += 4.5;

  drawJustifiedLine(
    doc,
    'espíritu Santo, y enséñenles a obedecer todo lo que les he mandado a ustedes. Por mi parte, yo estaré con',
    boxLeft,
    boxRight,
    yText
  );
  yText += 4.5;

  // Última línea de Mateo: texto a la izquierda y referencia alineada a la derecha
  doc.text('ustedes todos los días, hasta el fin del mundo.', boxLeft, yText);
  doc.text('San Mateo 28:18-20', boxRight, yText, { align: 'right' });

  // San Juan 3:5
  yText += 6.5;
  doc.text('El que no naciere de agua y del Espíritu, no puede entrar en el reino de Dios.', boxLeft, yText);
  doc.text('San Juan 3:5', boxRight, yText, { align: 'right' });

  // 6. Nombre de la persona en Monotype Corsiva Negrita Subrayado (28pt)
  yText = 105;
  doc.setFont('Corsiva', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(0, 0, 0);
  doc.text(data.nombre_persona, pageWidth / 2, yText, { align: 'center' });

  const nameWidth = doc.getTextWidth(data.nombre_persona);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - nameWidth / 2, yText + 1.2, pageWidth / 2 + nameWidth / 2, yText + 1.2);

  // 7. Fecha y ciudad de nacimiento en Goudy Old Style (13.5pt)
  yText = 115;
  doc.setFont('Goudy', 'normal');
  doc.setFontSize(13.5);
  const fechaNac = formatearFechaEspanol(data.fecha_nacimiento);
  const textoNacCompleto = `Que nació el día ${fechaNac}, en la ciudad de ${data.lugar_nacimiento}.`;

  if (doc.getTextWidth(textoNacCompleto) > 165) {
    // Si excede el ancho, partirlo elegantemente en 2 líneas
    const prefijo = `Que nació el día ${fechaNac}, en la ciudad de`;
    doc.text(prefijo, pageWidth / 2, yText, { align: 'center' });
    yText += 5;
    doc.text(`${data.lugar_nacimiento}.`, pageWidth / 2, yText, { align: 'center' });
  } else {
    doc.text(textoNacCompleto, pageWidth / 2, yText, { align: 'center' });
  }

  // 8. Padres (Goudy Old Style normal + Monotype Corsiva negrita)
  yText += 10;
  const labelPadres = `${hijoTexto} de: `;
  const padres = data.padre && data.madre ? `${data.padre} y ${data.madre}` : (data.padre || data.madre || '');

  doc.setFont('Goudy', 'normal');
  doc.setFontSize(13.5);
  const wLabel = doc.getTextWidth(labelPadres);

  doc.setFont('Corsiva', 'bold');
  doc.setFontSize(19);
  const wPadres = doc.getTextWidth(padres);

  const totalPadresW = wLabel + wPadres;
  const startPadresX = (pageWidth - totalPadresW) / 2;

  doc.setFont('Goudy', 'normal');
  doc.setFontSize(13.5);
  doc.text(labelPadres, startPadresX, yText);

  doc.setFont('Corsiva', 'bold');
  doc.setFontSize(19);
  doc.text(padres, startPadresX + wLabel, yText);

  // 9. Sacramento fecha en Goudy Old Style (13.5pt)
  yText += 9;
  doc.setFont('Goudy', 'normal');
  doc.setFontSize(13.5);
  const fechaBaut = formatearFechaEspanol(data.fecha_bautismo);
  doc.text(
    `El día ${fechaBaut}, fue ${hechoTexto} ${hijoTexto.toLowerCase()} de Dios, por el:`,
    pageWidth / 2,
    yText,
    { align: 'center' }
  );

  // 10. "Santo Bautismo" en Vivaldi negrita subrayado (28pt)
  yText += 12;
  doc.setFont('Vivaldi', 'bold');
  doc.setFontSize(28);
  doc.text('Santo Bautismo', pageWidth / 2, yText, { align: 'center' });
  const wSanto = doc.getTextWidth('Santo Bautismo');
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - wSanto / 2, yText + 1.2, pageWidth / 2 + wSanto / 2, yText + 1.2);

  // 11. Iglesia en Goudy Old Style Negrita (16pt)
  yText += 12;
  doc.setFont('Goudy', 'bold');
  doc.setFontSize(16);
  doc.text(
    'En la Iglesia Cristiana Luterana El Buen Pastor, de San Pedro Sula, Cortes, Honduras.',
    pageWidth / 2,
    yText,
    { align: 'center' }
  );

  // 12. Invocación Trinitaria en Goudy Old Style Negrita (15pt)
  yText += 7.5;
  doc.setFont('Goudy', 'bold');
  doc.setFontSize(15);
  doc.text('En el nombre del PADRE, y del HIJO, y del ESPIRITU SANTO.', pageWidth / 2, yText, { align: 'center' });

  // 13. Fórmula Sacramental con "SACRAMENTO," en negrita
  yText += 7.5;
  const part1 = 'Por medio de este ';
  const part2 = 'SACRAMENTO, ';
  const part3 = `ha recibido el perdón de sus pecados, ha sido ${hechoTexto}`;

  doc.setFont('Goudy', 'normal');
  doc.setFontSize(13.5);
  const w1 = doc.getTextWidth(part1);
  const w3 = doc.getTextWidth(part3);

  doc.setFont('Goudy', 'bold');
  const w2 = doc.getTextWidth(part2);

  const totalDescW = w1 + w2 + w3;
  const startDescX = (pageWidth - totalDescW) / 2;

  doc.setFont('Goudy', 'normal');
  doc.text(part1, startDescX, yText);

  doc.setFont('Goudy', 'bold');
  doc.text(part2, startDescX + w1, yText);

  doc.setFont('Goudy', 'normal');
  doc.text(part3, startDescX + w1 + w2, yText);

  yText += 6.5;
  doc.setFont('Goudy', 'normal');
  doc.setFontSize(13.5);
  doc.text(`${hijoTexto} de Dios y`, pageWidth / 2, yText, { align: 'center' });

  yText += 8;
  doc.setFont('Goudy', 'bold');
  doc.setFontSize(18);
  doc.text(`${herederoTexto} de la vida eterna.`, pageWidth / 2, yText, { align: 'center' });

  yText += 8;
  doc.setFont('Goudy', 'bold');
  doc.setFontSize(13.5);
  doc.text('Damos fe:', pageWidth / 2, yText, { align: 'center' });

  // 14. Firma del Pastor (Línea + Monotype Corsiva Negrita)
  yText = 220;
  const signLineW = 75;
  doc.setLineWidth(0.4);
  doc.line((pageWidth - signLineW) / 2, yText, (pageWidth + signLineW) / 2, yText);

  yText += 7;
  doc.setFont('Corsiva', 'bold');
  doc.setFontSize(16);
  const pastorNombre = data.pastor_oficiante.startsWith('Pr.') || data.pastor_oficiante.startsWith('Pastor')
    ? data.pastor_oficiante
    : `Pr. ${data.pastor_oficiante}`;
  doc.text(pastorNombre, pageWidth / 2, yText, { align: 'center' });

  yText += 6;
  doc.setFont('Corsiva', 'normal');
  doc.setFontSize(15);
  doc.text('Pastor', pageWidth / 2, yText, { align: 'center' });

  // 15. Datos inferiores (Reposición y N° Registro)
  const yFooter = 258;
  if (data.es_reposicion && data.nota_reposicion) {
    doc.setFont('Goudy', 'normal');
    doc.setFontSize(9);
    const splitLines = doc.splitTextToSize(data.nota_reposicion, 115);
    doc.text(splitLines, boxLeft, yFooter);
  }

  // N° Registro subrayado a la derecha en Goudy Old Style Negrita
  const regTexto = `N° Registro: ${data.numero_registro}`;
  doc.setFont('Goudy', 'bold');
  doc.setFontSize(10);
  doc.text(regTexto, boxRight, yFooter, { align: 'right' });
  const wReg = doc.getTextWidth(regTexto);
  doc.setLineWidth(0.35);
  doc.line(boxRight - wReg, yFooter + 0.8, boxRight, yFooter + 0.8);

  // Descargar archivo
  const cleanName = data.nombre_persona.replace(/\s+/g, '_');
  doc.save(`Fe_de_Bautismo_${cleanName}_Reg${data.numero_registro}.pdf`);
}
