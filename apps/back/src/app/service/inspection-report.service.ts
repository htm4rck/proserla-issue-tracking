import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { InspectionEntity } from '../entity/inspection.entity';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { AreaEntity } from '../entity/area.entity';
import { LOGO_PROSERLA_B64 } from '../../assets/logo-proserla.b64';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '').trim();
}

function statusLabel(s: string): string {
  if (s === 'open') return 'Pendiente';
  if (s === 'in_progress') return 'En proceso';
  if (s === 'closed') return 'Cerrada';
  return s;
}

function riskLabel(r: string): string {
  if (r === 'low') return 'Bajo';
  if (r === 'medium') return 'Medio';
  if (r === 'high') return 'Alto';
  return r;
}

function typeLabel(t: string): string {
  if (t === 'act') return 'Acto inseguro';
  if (t === 'condition') return 'Condición insegura';
  if (t === 'mixed') return 'Mixto';
  return t;
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function reportDate(ins: InspectionEntity): string {
  const day   = ins.reportDay   ?? new Date(ins.createdAt).getDate();
  const month = ins.reportMonth ?? '';
  const year  = ins.reportYear  ?? new Date(ins.createdAt).getFullYear();
  const time  = ins.reportTime  ? ` ${ins.reportTime}` : '';
  return `${String(day).padStart(2, '0')} ${month} ${year}${time}`.trim();
}

// ── Descarga de imagen con timeout ───────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

// ── Buffer del logo (embebido en base64) ─────────────────────────────────────
const LOGO_BUFFER: Buffer = Buffer.from(LOGO_PROSERLA_B64, 'base64');

const C = {
  headerBg:   '#1a5276',
  sectionBg:  '#d6eaf8',
  rowBg:      '#eaf4fb',
  border:     '#2980b9',
  text:       '#1a1a1a',
  muted:      '#555555',
  white:      '#ffffff',
  accent:     '#1a5276',
  green:      '#1e8449',
  red:        '#c0392b',
};

@Injectable()
export class InspectionReportService {
  private readonly logger = new Logger(InspectionReportService.name);

  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspRepo: Repository<InspectionEntity>,
    @InjectRepository(InspectionResponseEntity)
    private readonly respRepo: Repository<InspectionResponseEntity>,
    @InjectRepository(AreaEntity)
    private readonly areaRepo: Repository<AreaEntity>,
  ) {}

  async generatePdf(inspectionCode: string): Promise<Buffer> {
    const insp = await this.inspRepo.findOne({ where: { inspectionCode } });
    if (!insp) throw new NotFoundException(`Inspección ${inspectionCode} no encontrada`);

    const evidences = await this.respRepo.find({
      where: { inspectionCode },
      order: { createdAt: 'ASC' },
    });

    const area = await this.areaRepo.findOne({ where: { code: insp.areaCode } });
    const areaName = area?.name ?? insp.areaCode;

    // ── Descargar imágenes de evidencia en paralelo ──────────────────────────
    const imageBuffers = new Map<string, Buffer>();
    const downloadTasks = evidences
      .filter(ev => ev.url?.trim())
      .map(async (ev) => {
        const buf = await fetchImageBuffer(ev.url);
        if (buf) imageBuffers.set(ev.id, buf);
        else this.logger.warn(`No se pudo descargar imagen ${ev.url}`);
      });
    await Promise.all(downloadTasks);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36,
        info: {
          Title: `Registro de Inspección ${inspectionCode}`,
          Author: 'RACI - Sistema de Inspecciones',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width - 72;
      const L = 36;
      const PAGE_BOTTOM = doc.page.height - 36;
      let y = 36;

      // ── Utilidades de dibujo ──────────────────────────────────────────────

      const rect = (x: number, ry: number, w: number, h: number, fill: string, stroke?: string) => {
        doc.rect(x, ry, w, h).fillAndStroke(fill, stroke ?? fill);
      };

      const cell = (
        x: number, cy: number, w: number, h: number,
        text: string,
        opts: { bg?: string; bold?: boolean; size?: number; align?: 'left' | 'center' | 'right'; color?: string; valign?: 'top' | 'center' } = {},
      ) => {
        const bg = opts.bg ?? C.white;
        rect(x, cy, w, h, bg, C.border);
        const savedY = doc.y;
        doc
          .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(opts.size ?? 8)
          .fillColor(opts.color ?? C.text)
          .text(text, x + 3, cy + (opts.valign === 'center' ? h / 2 - (opts.size ?? 8) / 2 : 3), {
            width: w - 6,
            align: opts.align ?? 'left',
            lineBreak: true,
          });
        doc.y = savedY;
      };

      const sectionHeader = (title: string, sy: number, h = 16): number => {
        rect(L, sy, W, h, C.sectionBg, C.border);
        const savedY = doc.y;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent)
          .text(title, L + 4, sy + 4, { width: W - 8, align: 'center' });
        doc.y = savedY;
        return sy + h;
      };

      const multilineCell = (
        x: number, cy: number, w: number, minH: number,
        text: string, bg = C.white,
      ): number => {
        const measured = doc.font('Helvetica').fontSize(8)
          .heightOfString(text || ' ', { width: w - 6 });
        const h = Math.max(minH, measured + 8);
        rect(x, cy, w, h, bg, C.border);
        const savedY = doc.y;
        doc.font('Helvetica').fontSize(8).fillColor(C.text)
          .text(text || '', x + 3, cy + 4, { width: w - 6, lineBreak: true });
        doc.y = savedY;
        return h;
      };

      const ensureSpace = (needed: number): void => {
        if (y + needed > PAGE_BOTTOM) {
          doc.addPage();
          y = 36;
        }
      };

      // ══════════════════════════════════════════════════════════════════════
      // CABECERA INSTITUCIONAL
      // ══════════════════════════════════════════════════════════════════════

      const logoW = 110;
      const logoH = 50;

      rect(L, y, logoW, logoH, '#ffffff', C.border);
      try {
        doc.image(LOGO_BUFFER, L + 2, y + 2, { fit: [logoW - 4, logoH - 4] });
      } catch {
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e8449')
          .text('proserla', L + 8, y + 12, { width: logoW - 16, align: 'center' });
        doc.y = y;
      }

      rect(L + logoW, y, W - logoW - 70, logoH, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.accent)
        .text('REGISTRO DE INSPECCIONES INTERNAS DE SEGURIDAD Y\nSALUD EN EL TRABAJO',
          L + logoW + 4, y + 10, { width: W - logoW - 70 - 8, align: 'center' });

      rect(L + W - 70, y, 70, 25, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
        .text('Código: SSM-RE-005-02', L + W - 68, y + 4, { width: 66 });
      rect(L + W - 70, y + 25, 70, 25, C.white, C.border);
      doc.font('Helvetica').fontSize(7).fillColor(C.text)
        .text('Vigencia: 16.04.26', L + W - 68, y + 29, { width: 66 });

      y += logoH + 8;

      // ══════════════════════════════════════════════════════════════════════
      // N° DE REGISTRO
      // ══════════════════════════════════════════════════════════════════════
      const regH = 18;
      rect(L, y, W, regH, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text)
        .text('N° DE REGISTRO:', L + 4, y + 5);
      doc.y = y;
      doc.font('Helvetica').fontSize(9).fillColor(C.accent)
        .text(inspectionCode, L + 90, y + 4, { width: 160 });
      doc.y = y;
      y += regH;

      // ══════════════════════════════════════════════════════════════════════
      // DATOS DEL EMPLEADOR
      // ══════════════════════════════════════════════════════════════════════
      y = sectionHeader('DATOS DEL EMPLEADOR', y);

      const empHeaderH = 24; // ← Aumentado de 14 a 24 para que quepa 2 líneas
      const empH = 28;
      const col1 = W * 0.22, col2 = W * 0.14, col3 = W * 0.28, col4 = W * 0.20, col5 = W * 0.16;
      // Cabeceras
      cell(L,                    y, col1, empHeaderH, 'RAZÓN SOCIAL O\nDENOMINACIÓN SOCIAL', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + col1,             y, col2, empHeaderH, 'RUC',                                { bg: C.rowBg, bold: true, size: 7, align: 'center', valign: 'center' });
      cell(L + col1 + col2,      y, col3, empHeaderH, 'DOMICILIO\n(Dirección, distrito,\ndepartamento, provincia)', { bg: C.rowBg, bold: true, size: 6, align: 'center' });
      cell(L + col1+col2+col3,   y, col4, empHeaderH, 'ACTIVIDAD\nECONÓMICA',                { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + col1+col2+col3+col4, y, col5, empHeaderH, 'N° DE TRABAJADORES\nEN EL CENTRO\nDE LABORES', { bg: C.rowBg, bold: true, size: 6, align: 'center' });
      y += empHeaderH;
      // Valores
      cell(L,                    y, col1, empH, 'Promotora y Servicios Lambayeque S.A.C.', { size: 7 });
      cell(L + col1,             y, col2, empH, '20479813877',                              { size: 7, align: 'center' });
      cell(L + col1 + col2,      y, col3, empH, 'Cal. Antolín Flores Nro. 1580 C.P. Villa San Juan, Jayanca, Lambayeque, Lambayeque', { size: 7 });
      cell(L + col1+col2+col3,   y, col4, empH, 'Actividad Agraria',                        { size: 7, align: 'center' });
      cell(L + col1+col2+col3+col4, y, col5, empH, '',                                      { size: 7 });
      y += empH;

      // ── Área, fecha, responsables ─────────────────────────────────────────
      const infoHeaderH = 22; // ← Aumentado para 2 líneas
      const infoH = 18;
      const c1 = W * 0.25, c2 = W * 0.25, c3 = W * 0.25, c4 = W * 0.25;
      cell(L,          y, c1, infoHeaderH, 'ÁREA\nINSPECCIONADA',          { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + c1,     y, c2, infoHeaderH, 'FECHA DE LA\nINSPECCIÓN',      { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + c1+c2,  y, c3, infoHeaderH, 'RESPONSABLE DEL ÁREA\nINSPECCIONADA', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + c1+c2+c3, y, c4, infoHeaderH, 'RESPONSABLE DE\nLA INSPECCIÓN', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      y += infoHeaderH;
      cell(L,          y, c1, infoH, areaName,                      { size: 8 });
      cell(L + c1,     y, c2, infoH, reportDate(insp),              { size: 8, align: 'center' });
      cell(L + c1+c2,  y, c3, infoH, esc(insp.leaderCode),          { size: 8 });
      cell(L + c1+c2+c3, y, c4, infoH, esc(insp.assignedTo),        { size: 8 });
      y += infoH;

      // ── Hora + Tipo de inspección ─────────────────────────────────────────
      const horaHeaderH = 22; // ← Aumentado para 2 líneas
      const horaW = W * 0.18, tipoW = W * 0.82;
      const tipoColW = tipoW / 3;
      cell(L,          y, horaW, horaHeaderH, 'HORA DE LA\nINSPECCIÓN',       { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + horaW,  y, tipoW, horaHeaderH, 'TIPO DE LA INSPECCIÓN (MARCA CON X)', { bg: C.rowBg, bold: true, size: 7, align: 'center', valign: 'center' });
      y += horaHeaderH;
      cell(L,          y, horaW, 14, esc(insp.reportTime),          { size: 8, align: 'center' });
      const isPlanned   = insp.reportSource === 'checklist';
      const isUnplanned = !isPlanned && insp.reportSource !== '';
      cell(L + horaW,              y, tipoColW, 14, isPlanned   ? 'PLANEADA  [X]'    : 'PLANEADA',    { size: 8, align: 'center', bold: isPlanned });
      cell(L + horaW + tipoColW,   y, tipoColW, 14, isUnplanned ? 'NO PLANEADA  [X]' : 'NO PLANEADA', { size: 8, align: 'center', bold: isUnplanned });
      cell(L + horaW + tipoColW*2, y, tipoColW, 14, 'OTRO, DETALLAR',                                 { size: 8, align: 'center' });
      y += 18;

      // ══════════════════════════════════════════════════════════════════════
      // SECCIONES DE TEXTO
      // ══════════════════════════════════════════════════════════════════════

      const sections: Array<{ title: string; content: string }> = [
        { title: 'OBJETIVO DE LA INSPECCIÓN INTERNA',
          content: typeLabel(insp.inspectionType) + (insp.workArea ? ` — ${insp.workArea}` : '') },
        { title: 'RESULTADO DE LA INSPECCIÓN',
          content: esc(insp.description) },
        { title: 'DESCRIPCIÓN DE LA CAUSA ANTE RESULTADOS DESFAVORABLES DE LA INSPECCIÓN',
          content: esc(insp.comment) },
        { title: 'CONCLUSIONES Y RECOMENDACIONES',
          content: esc(insp.correctiveMeasures) },
      ];

      for (const sec of sections) {
        y = sectionHeader(sec.title, y);
        const h = multilineCell(L, y, W, 32, sec.content);
        y += h;
      }

      // ══════════════════════════════════════════════════════════════════════
      // ADJUNTAR
      // ══════════════════════════════════════════════════════════════════════
      rect(L, y, W, 22, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text).text('ADJUNTAR:', L + 4, y + 4);
      doc.font('Helvetica').fontSize(8).fillColor(C.text).text('– Informe de Inspección', L + 4, y + 13);
      y += 22;

      // ══════════════════════════════════════════════════════════════════════
      // EVIDENCIAS FOTOGRÁFICAS (imágenes embebidas)
      // ══════════════════════════════════════════════════════════════════════
      if (evidences.length > 0) {
        const IMG_H = 140; // altura fija por imagen
        const IMG_W = W / 2 - 10; // 2 imágenes por fila si caben

        ensureSpace(20);
        rect(L, y, W, 16, C.sectionBg, C.border);
        const savedY2 = doc.y;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent)
          .text('EVIDENCIAS FOTOGRÁFICAS', L + 4, y + 4, { width: W - 8, align: 'center' });
        doc.y = savedY2;
        y += 16;

        // Renderizar imágenes en grilla de 2 columnas
        const evWithImages = evidences.filter(ev => imageBuffers.has(ev.id));
        const evWithoutImages = evidences.filter(ev => !imageBuffers.has(ev.id));

        for (let i = 0; i < evWithImages.length; i += 2) {
          const labelH = 14;
          const blockH = labelH + IMG_H + 4;
          ensureSpace(blockH);

          // Columna izquierda
          const ev1 = evWithImages[i];
          const buf1 = imageBuffers.get(ev1.id)!;
          const x1 = L;
          const imgW = evWithImages.length === 1 ? W : IMG_W;

          // Etiqueta
          const label1 = `${ev1.imageType === 'closure' ? '✅ Cierre' : '📷 Informe'}${ev1.uploadedBy ? ' — ' + ev1.uploadedBy : ''}`;
          rect(x1, y, imgW, labelH, C.rowBg, C.border);
          const sy1 = doc.y;
          doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
            .text(label1, x1 + 3, y + 3, { width: imgW - 6 });
          doc.y = sy1;
          // Imagen
          rect(x1, y + labelH, imgW, IMG_H, C.white, C.border);
          try {
            doc.image(buf1, x1 + 4, y + labelH + 4, {
              fit: [imgW - 8, IMG_H - 8],
              align: 'center',
              valign: 'center',
            });
          } catch { /* imagen corrupta, se deja celda vacía */ }

          // Columna derecha (si hay)
          if (i + 1 < evWithImages.length) {
            const ev2 = evWithImages[i + 1];
            const buf2 = imageBuffers.get(ev2.id)!;
            const x2 = L + IMG_W + 20;

            const label2 = `${ev2.imageType === 'closure' ? '✅ Cierre' : '📷 Informe'}${ev2.uploadedBy ? ' — ' + ev2.uploadedBy : ''}`;
            rect(x2, y, IMG_W, labelH, C.rowBg, C.border);
            const sy2 = doc.y;
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
              .text(label2, x2 + 3, y + 3, { width: IMG_W - 6 });
            doc.y = sy2;
            rect(x2, y + labelH, IMG_W, IMG_H, C.white, C.border);
            try {
              doc.image(buf2, x2 + 4, y + labelH + 4, {
                fit: [IMG_W - 8, IMG_H - 8],
                align: 'center',
                valign: 'center',
              });
            } catch { /* imagen corrupta */ }
          }

          y += blockH;
        }

        // Evidencias sin imagen descargada (fallback: mostrar URL)
        if (evWithoutImages.length > 0) {
          ensureSpace(14 + evWithoutImages.length * 14);
          rect(L, y, W, 14, C.rowBg, C.border);
          const sy3 = doc.y;
          doc.font('Helvetica-Bold').fontSize(7).fillColor(C.accent)
            .text('EVIDENCIAS NO DISPONIBLES PARA DESCARGA', L + 4, y + 4, { width: W - 8, align: 'center' });
          doc.y = sy3;
          y += 14;
          for (const ev of evWithoutImages) {
            rect(L, y, W * 0.15, 14, C.white, C.border);
            const sy4 = doc.y;
            doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
              .text(ev.imageType === 'closure' ? 'Cierre' : 'Informe', L + 3, y + 4, { width: W * 0.15 - 6 });
            doc.y = sy4;
            rect(L + W * 0.15, y, W * 0.85, 14, C.white, C.border);
            const sy5 = doc.y;
            doc.font('Helvetica').fontSize(7).fillColor('#1a5276')
              .text(esc(ev.url), L + W * 0.15 + 3, y + 4, { width: W * 0.85 - 6 });
            doc.y = sy5;
            y += 14;
          }
        }
      }

      y += 6;

      // ══════════════════════════════════════════════════════════════════════
      // FIRMAS
      // ══════════════════════════════════════════════════════════════════════
      const signRows: Array<{ title: string; name: string }> = [
        { title: 'RESPONSABLE DE LA INSPECCIÓN', name: esc(insp.assignedTo) },
        { title: 'RESPONSABLE DE ÁREA',           name: esc(insp.leaderCode) },
        { title: 'REPRESENTANTE DEL COMITÉ DE SEGURIDAD', name: '' },
        { title: 'RESPONSABLE DEL REGISTRO',      name: esc(insp.reportedBy) },
      ];

      const firmasBlockH = signRows.length * 35 + 20;
      ensureSpace(firmasBlockH);

      for (const row of signRows) {
        y = sectionHeader(row.title, y, 13);
        const fw = W / 4;
        cell(L,          y, fw, 22, 'Nombre',  { bg: C.rowBg, bold: true, size: 7 });
        cell(L + fw,     y, fw, 22, 'Cargo',   { bg: C.rowBg, bold: true, size: 7 });
        cell(L + fw*2,   y, fw, 22, 'Fecha',   { bg: C.rowBg, bold: true, size: 7 });
        cell(L + fw*3,   y, fw, 22, 'Firma',   { bg: C.rowBg, bold: true, size: 7 });
        y += 13;
        cell(L,          y, fw, 22, row.name,  { size: 8 });
        cell(L + fw,     y, fw, 22, '',        { size: 8 });
        cell(L + fw*2,   y, fw, 22, formatDate(new Date()), { size: 8, align: 'center' });
        cell(L + fw*3,   y, fw, 22, '',        { size: 8 });
        y += 22;
      }

      // ── Pie de página ─────────────────────────────────────────────────────
      y += 6;
      doc.font('Helvetica').fontSize(6).fillColor(C.muted)
        .text(
          `Generado por RACI · ${new Date().toLocaleString('es-PE')} · Estado: ${statusLabel(insp.status)} · Riesgo: ${riskLabel(insp.riskLevel)}`,
          L, y, { width: W, align: 'center' },
        );

      doc.end();
    });
  }
}
