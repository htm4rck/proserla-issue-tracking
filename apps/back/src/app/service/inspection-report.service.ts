import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { InspectionEntity } from '../entity/inspection.entity';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { AreaEntity } from '../entity/area.entity';

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

// ── Colores corporativos ──────────────────────────────────────────────────────
const C = {
  headerBg:   '#1a5276',   // azul oscuro cabecera
  sectionBg:  '#d6eaf8',   // azul claro sección
  rowBg:      '#eaf4fb',   // fila alternada
  border:     '#2980b9',   // borde tabla
  text:       '#1a1a1a',
  muted:      '#555555',
  white:      '#ffffff',
  accent:     '#1a5276',
  green:      '#1e8449',
  red:        '#c0392b',
};

@Injectable()
export class InspectionReportService {
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

      const W = doc.page.width - 72;   // ancho útil (márgenes 36 c/lado)
      const L = 36;                     // margen izquierdo
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
        doc
          .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(opts.size ?? 8)
          .fillColor(opts.color ?? C.text)
          .text(text, x + 3, cy + (opts.valign === 'center' ? h / 2 - (opts.size ?? 8) / 2 : 3), {
            width: w - 6,
            align: opts.align ?? 'left',
            lineBreak: true,
          });
      };

      const sectionHeader = (title: string, sy: number, h = 16): number => {
        rect(L, sy, W, h, C.sectionBg, C.border);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.accent)
          .text(title, L + 4, sy + 4, { width: W - 8, align: 'center' });
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
        doc.font('Helvetica').fontSize(8).fillColor(C.text)
          .text(text || '', x + 3, cy + 4, { width: w - 6, lineBreak: true });
        return h;
      };

      // ══════════════════════════════════════════════════════════════════════
      // CABECERA INSTITUCIONAL
      // ══════════════════════════════════════════════════════════════════════

      // Logo placeholder (rectángulo verde con texto)
      rect(L, y, 110, 50, '#e8f8f5', C.border);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#1e8449')
        .text('proserla', L + 8, y + 8, { width: 94, align: 'center' });
      doc.font('Helvetica').fontSize(6).fillColor(C.muted)
        .text('promotora y servicios lambayeque s.a.c.', L + 4, y + 22, { width: 102, align: 'center' });

      // Título central
      rect(L + 110, y, W - 180, 50, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.accent)
        .text('REGISTRO DE INSPECCIONES INTERNAS DE SEGURIDAD Y\nSALUD EN EL TRABAJO',
          L + 112, y + 10, { width: W - 184, align: 'center' });

      // Código y vigencia
      rect(L + W - 70, y, 70, 25, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
        .text('Código: SSM-RE-005-02', L + W - 68, y + 4, { width: 66 });
      rect(L + W - 70, y + 25, 70, 25, C.white, C.border);
      doc.font('Helvetica').fontSize(7).fillColor(C.text)
        .text('Vigencia: 16.04.26', L + W - 68, y + 29, { width: 66 });

      y += 58;

      // ══════════════════════════════════════════════════════════════════════
      // N° DE REGISTRO
      // ══════════════════════════════════════════════════════════════════════
      const regH = 18;
      rect(L, y, W, regH, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text)
        .text('N° DE REGISTRO:', L + 4, y + 5);
      doc.font('Helvetica').fontSize(9).fillColor(C.accent)
        .text(inspectionCode, L + 90, y + 4, { width: 160 });
      y += regH;

      // ══════════════════════════════════════════════════════════════════════
      // DATOS DEL EMPLEADOR
      // ══════════════════════════════════════════════════════════════════════
      y = sectionHeader('DATOS DEL EMPLEADOR', y);

      const empH = 28;
      const col1 = W * 0.22, col2 = W * 0.14, col3 = W * 0.28, col4 = W * 0.20, col5 = W * 0.16;
      // Cabeceras
      cell(L,                    y, col1, 14, 'RAZÓN SOCIAL O DENOMINACIÓN SOCIAL', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + col1,             y, col2, 14, 'RUC',                                { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + col1 + col2,      y, col3, 14, 'DOMICILIO\n(Dirección, distrito, departamento, provincia)', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + col1+col2+col3,   y, col4, 14, 'ACTIVIDAD ECONÓMICA',                { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + col1+col2+col3+col4, y, col5, 14, 'N° DE TRABAJADORES EN EL CENTRO DE LABORES', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      y += 14;
      // Valores
      cell(L,                    y, col1, empH, 'Promotora y Servicios Lambayeque S.A.C.', { size: 7 });
      cell(L + col1,             y, col2, empH, '20479813877',                              { size: 7, align: 'center' });
      cell(L + col1 + col2,      y, col3, empH, 'Cal. Antolín Flores Nro. 1580 C.P. Villa San Juan, Jayanca, Lambayeque, Lambayeque', { size: 7 });
      cell(L + col1+col2+col3,   y, col4, empH, 'Actividad Agraria',                        { size: 7, align: 'center' });
      cell(L + col1+col2+col3+col4, y, col5, empH, '',                                      { size: 7 });
      y += empH;

      // ── Área, fecha, responsables ─────────────────────────────────────────
      const infoH = 18;
      const c1 = W * 0.25, c2 = W * 0.25, c3 = W * 0.25, c4 = W * 0.25;
      cell(L,          y, c1, infoH, 'ÁREA INSPECCIONADA',          { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + c1,     y, c2, infoH, 'FECHA DE LA INSPECCIÓN',      { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + c1+c2,  y, c3, infoH, 'RESPONSABLE DEL ÁREA INSPECCIONADA', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + c1+c2+c3, y, c4, infoH, 'RESPONSABLE DE LA INSPECCIÓN', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      y += infoH;
      cell(L,          y, c1, infoH, areaName,                      { size: 8 });
      cell(L + c1,     y, c2, infoH, reportDate(insp),              { size: 8, align: 'center' });
      cell(L + c1+c2,  y, c3, infoH, esc(insp.leaderCode),          { size: 8 });
      cell(L + c1+c2+c3, y, c4, infoH, esc(insp.assignedTo),        { size: 8 });
      y += infoH;

      // ── Hora + Tipo de inspección ─────────────────────────────────────────
      const horaW = W * 0.18, tipoW = W * 0.82;
      const tipoColW = tipoW / 3;
      cell(L,          y, horaW, 14, 'HORA DE LA INSPECCIÓN',       { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      cell(L + horaW,  y, tipoW, 14, 'TIPO DE LA INSPECCIÓN (MARCA CON X)', { bg: C.rowBg, bold: true, size: 7, align: 'center' });
      y += 14;
      cell(L,          y, horaW, 14, esc(insp.reportTime),          { size: 8, align: 'center' });
      const isPlanned   = insp.reportSource === 'checklist';
      const isUnplanned = !isPlanned && insp.reportSource !== '';
      cell(L + horaW,              y, tipoColW, 14, `PLANEADA${isPlanned ? '  ✓' : ''}`,     { size: 8, align: 'center', bold: isPlanned });
      cell(L + horaW + tipoColW,   y, tipoColW, 14, `NO PLANEADA${isUnplanned ? '  ✓' : ''}`, { size: 8, align: 'center', bold: isUnplanned });
      cell(L + horaW + tipoColW*2, y, tipoColW, 14, 'OTRO, DETALLAR',                         { size: 8, align: 'center' });
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
        const h = multilineCell(L, y, W, 48, sec.content);
        y += h;
      }

      // ══════════════════════════════════════════════════════════════════════
      // ADJUNTAR
      // ══════════════════════════════════════════════════════════════════════
      rect(L, y, W, 22, C.white, C.border);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.text).text('ADJUNTAR:', L + 4, y + 4);
      doc.font('Helvetica').fontSize(8).fillColor(C.text).text('– Informe de Inspección', L + 4, y + 13);
      y += 22;

      // Evidencias adjuntas
      if (evidences.length > 0) {
        rect(L, y, W, 14, C.rowBg, C.border);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(C.accent)
          .text('EVIDENCIAS REGISTRADAS EN EL SISTEMA', L + 4, y + 4, { width: W - 8, align: 'center' });
        y += 14;
        for (const ev of evidences) {
          const evH = 14;
          rect(L, y, W * 0.2, evH, C.white, C.border);
          doc.font('Helvetica-Bold').fontSize(7).fillColor(C.text)
            .text(ev.imageType === 'closure' ? 'Cierre' : 'Informe', L + 3, y + 4, { width: W * 0.2 - 6 });
          rect(L + W * 0.2, y, W * 0.6, evH, C.white, C.border);
          doc.font('Helvetica').fontSize(7).fillColor('#1a5276')
            .text(esc(ev.url), L + W * 0.2 + 3, y + 4, { width: W * 0.6 - 6 });
          rect(L + W * 0.8, y, W * 0.2, evH, C.white, C.border);
          doc.font('Helvetica').fontSize(7).fillColor(C.muted)
            .text(esc(ev.uploadedBy), L + W * 0.8 + 3, y + 4, { width: W * 0.2 - 6 });
          y += evH;
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

      for (const row of signRows) {
        // Verificar si hay espacio; si no, nueva página
        if (y + 28 > doc.page.height - 36) {
          doc.addPage();
          y = 36;
        }
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
      doc.font('Helvetica').fontSize(6).fillColor(C.muted)
        .text(
          `Generado por RACI · ${new Date().toLocaleString('es-PE')} · Estado: ${statusLabel(insp.status)} · Riesgo: ${riskLabel(insp.riskLevel)}`,
          L, doc.page.height - 24, { width: W, align: 'center' },
        );

      doc.end();
    });
  }
}
