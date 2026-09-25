import jsPDF from 'jspdf';
import {
  LUTHER_ROSE_DOCX_BASE64,
  FONT_VIVALDI_BASE64,
  FONT_CORSIVA_BASE64
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

export function generarPDFBautismo(data: BautismoPDFData): void {
  // Hoja en tamaño carta vertical (Letter: 215.9 x 279.4 mm)
  const doc = new jsPDF({ format: 'letter', unit: 'mm', orientation: 'portrait' });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Registrar fuentes originales del documento Word
  doc.addFileToVFS('Vivaldi.ttf', FONT_VIVALDI_BASE64);
  doc.addFont('Vivaldi.ttf', 'Vivaldi', 'normal');

  doc.addFileToVFS('Corsiva.ttf', FONT_CORSIVA_BASE64);
  doc.addFont('Corsiva.ttf', 'Corsiva', 'normal');

  const isFemenino = data.genero === 'F';
  const hijoTexto = isFemenino ? 'Hija' : 'Hijo';
  const herederoTexto = isFemenino ? 'Heredera' : 'Heredero';
  const hechoTexto = isFemenino ? 'hecha' : 'hecho';

  // 1. Marco exterior simple negro (idéntico a la plantilla Word original)
  const margin = 12;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'D');

  // 2. Rosa de Lutero original del docx
  const logoW = 27;
  const logoH = 27;
  const logoX = (pageWidth - logoW) / 2;
  const logoY = 19;
  doc.addImage(LUTHER_ROSE_DOCX_BASE64, 'PNG', logoX, logoY, logoW, logoH);

  // 3. Título "Fe de Bautismo" en fuente Vivaldi original
  doc.setFont('Vivaldi', 'normal');
  doc.setFontSize(36);
  doc.setTextColor(0, 0, 0);
  doc.text('Fe de Bautismo', pageWidth / 2, 57, { align: 'center' });

  // 4. Citas Bíblicas (Times New Roman, 9pt)
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const boxLeft = 20;
  const boxRight = pageWidth - 20;

  let yText = 68;
  const verso1 = [
    'Jesús se acercó a ellos y les dijo: –Dios me ha dado toda autoridad en el cielo y en la tierra. Vayan, pues, a las',
    'gentes de todas las naciones, y háganlas mis discípulos; bautícenlas en el nombre del Padre, del Hijo y del',
    'espíritu Santo, y enséñenles a obedecer todo lo que les he mandado a ustedes. Por mi parte, yo estaré con',
  ];
  verso1.forEach((line) => {
    doc.text(line, boxLeft, yText);
    yText += 4.2;
  });

  // Última línea con referencia "San Mateo 28:18-20" alineada a la derecha
  doc.text('ustedes todos los días, hasta el fin del mundo.', boxLeft, yText);
  doc.text('San Mateo 28:18-20', boxRight, yText, { align: 'right' });

  // Versículo 2 (San Juan 3:5)
  yText += 6.5;
  doc.text('El que no naciere de agua y del Espíritu, no puede entrar en el reino de Dios.', boxLeft, yText);
  yText += 4.5;
  doc.text('San Juan 3:5', boxRight, yText, { align: 'right' });

  // 5. Nombre de la persona en Monotype Corsiva subrayado
  yText = 101;
  doc.setFont('Corsiva', 'normal');
  doc.setFontSize(26);
  doc.setTextColor(0, 0, 0);
  doc.text(data.nombre_persona, pageWidth / 2, yText, { align: 'center' });

  const nameWidth = doc.getTextWidth(data.nombre_persona);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - nameWidth / 2, yText + 1.2, pageWidth / 2 + nameWidth / 2, yText + 1.2);

  // 6. Fecha y ciudad de nacimiento
  yText = 111;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const fechaNac = formatearFechaEspanol(data.fecha_nacimiento);
  doc.text(`Que nació el día ${fechaNac}, en la ciudad de ${data.lugar_nacimiento}.`, pageWidth / 2, yText, { align: 'center' });

  // 7. Padres (Times + Monotype Corsiva)
  yText = 120;
  const padres = data.padre && data.madre ? `${data.padre} y ${data.madre}` : (data.padre || data.madre || '');
  const labelPadres = `${hijoTexto} de: `;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const wLabel = doc.getTextWidth(labelPadres);

  doc.setFont('Corsiva', 'normal');
  doc.setFontSize(15);
  const wPadres = doc.getTextWidth(padres);

  const totalWPadres = wLabel + wPadres;
  const startXPadres = (pageWidth - totalWPadres) / 2;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(labelPadres, startXPadres, yText);

  doc.setFont('Corsiva', 'normal');
  doc.setFontSize(15);
  doc.text(padres, startXPadres + wLabel, yText);

  // 8. Bautismo y "Santo Bautismo" en Vivaldi
  yText = 130;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  const fechaBaut = formatearFechaEspanol(data.fecha_bautismo);
  doc.text(`El día ${fechaBaut}, fue ${hechoTexto} ${hijoTexto.toLowerCase()} de Dios, por el:`, pageWidth / 2, yText, { align: 'center' });

  yText = 142;
  doc.setFont('Vivaldi', 'normal');
  doc.setFontSize(26);
  doc.text('Santo Bautismo', pageWidth / 2, yText, { align: 'center' });
  const wSanto = doc.getTextWidth('Santo Bautismo');
  doc.line(pageWidth / 2 - wSanto / 2, yText + 1.2, pageWidth / 2 + wSanto / 2, yText + 1.2);

  // 9. Fórmula Teológica Sacramental
  yText = 154;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text('En la Iglesia Cristiana Luterana El Buen Pastor, de San Pedro Sula, Cortes, Honduras.', pageWidth / 2, yText, { align: 'center' });

  yText += 6;
  doc.setFont('times', 'bold');
  doc.setFontSize(12.5);
  doc.text('En el nombre del PADRE, y del HIJO, y del ESPIRITU SANTO.', pageWidth / 2, yText, { align: 'center' });

  yText += 6;
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(`Por medio de este SACRAMENTO, ha recibido el perdón de sus pecados, ha sido ${hechoTexto}`, pageWidth / 2, yText, { align: 'center' });

  yText += 5.5;
  doc.text(`${hijoTexto} de Dios y`, pageWidth / 2, yText, { align: 'center' });

  yText += 7;
  doc.setFontSize(16);
  doc.text(`${herederoTexto} de la vida eterna.`, pageWidth / 2, yText, { align: 'center' });

  yText += 7;
  doc.setFont('times', 'bold');
  doc.setFontSize(11.5);
  doc.text('Damos fe:', pageWidth / 2, yText, { align: 'center' });

  // 10. Firma del Pastor (Línea + Monotype Corsiva)
  yText = 222;
  const signLineW = 75;
  doc.setLineWidth(0.4);
  doc.line((pageWidth - signLineW) / 2, yText, (pageWidth + signLineW) / 2, yText);

  yText += 5.5;
  doc.setFont('Corsiva', 'normal');
  doc.setFontSize(15);
  doc.text(data.pastor_oficiante, pageWidth / 2, yText, { align: 'center' });

  yText += 5.5;
  doc.setFontSize(13);
  doc.text('Pastor', pageWidth / 2, yText, { align: 'center' });

  // 11. Datos inferiores (Reposición y N° Registro)
  const botY = 247;
  if (data.es_reposicion && data.nota_reposicion) {
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    const splitLines = doc.splitTextToSize(data.nota_reposicion, 110);
    doc.text(splitLines, 20, botY);
  }

  // N° Registro subrayado a la derecha
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  const regStr = `N° Registro: ${data.numero_registro}`;
  doc.text(regStr, pageWidth - 20, botY + 3, { align: 'right' });
  const wReg = doc.getTextWidth(regStr);
  doc.line(pageWidth - 20 - wReg, botY + 3.8, pageWidth - 20, botY + 3.8);

  // Descargar archivo
  const cleanName = data.nombre_persona.replace(/\s+/g, '_');
  doc.save(`Fe_de_Bautismo_${cleanName}_Reg${data.numero_registro}.pdf`);
}
