import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { InspectionEntity } from '../entity/inspection.entity';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { AreaEntity } from '../entity/area.entity';

// ── Fuente corporativa ────────────────────────────────────────────────────────
// ExcelJS usa el nombre exacto de la fuente instalada en el sistema del cliente.
// "Gill Sans MT" es el nombre en Windows; en Mac es "Gill Sans".
// Usamos "Gill Sans MT" como primario — Excel lo resolverá al equivalente disponible.
const FONT = 'Gill Sans MT';

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(v: unknown): string { return String(v ?? '').trim(); }

function riskLabel(r: string): string {
  if (r === 'low')    return 'BAJO';
  if (r === 'medium') return 'MEDIO';
  if (r === 'high')   return 'ALTO';
  return r.toUpperCase();
}

function statusLabel(s: string): string {
  if (s === 'open')        return 'ABIERTO';
  if (s === 'in_progress') return 'PROCESO';
  if (s === 'closed')      return 'CERRADO';
  return s.toUpperCase();
}

function formatDatePE(d: Date): string {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

// ── Paleta ────────────────────────────────────────────────────────────────────
const HEADER_BG  = '1a3a5c';
const SUB_BG     = '2e86c1';
const LIGHT_BLUE = 'd6eaf8';
const WHITE      = 'FFFFFF';

const RISK_COLORS: Record<string, { bg: string; font: string }> = {
  BAJO:  { bg: 'FFFF00', font: '000000' },
  MEDIO: { bg: 'FF8C00', font: 'FFFFFF' },
  ALTO:  { bg: 'FF0000', font: 'FFFFFF' },
};
const STATUS_COLORS: Record<string, { bg: string; font: string }> = {
  ABIERTO: { bg: 'FF0000', font: 'FFFFFF' },
  PROCESO: { bg: 'FFA500', font: '000000' },
  CERRADO: { bg: '00B050', font: 'FFFFFF' },
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface ConsolidatedReportFilters {
  site?: string;
  reportMonth?: string;
  reportYear?: number;
  areaCode?: string;
  leaderCode?: string;
}

// ── Descarga de imagen con timeout ───────────────────────────────────────────
async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; ext: 'jpeg' | 'png' | 'gif' } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    const ext: 'jpeg' | 'png' | 'gif' =
      ct.includes('png') ? 'png' : ct.includes('gif') ? 'gif' : 'jpeg';
    const ab = await res.arrayBuffer();
    return { buffer: Buffer.from(ab), ext };
  } catch {
    return null;
  }
}

// ── Servicio ──────────────────────────────────────────────────────────────────
@Injectable()
export class InspectionConsolidatedReportService {
  private readonly logger = new Logger(InspectionConsolidatedReportService.name);

  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspRepo: Repository<InspectionEntity>,
    @InjectRepository(InspectionResponseEntity)
    private readonly respRepo: Repository<InspectionResponseEntity>,
    @InjectRepository(AreaEntity)
    private readonly areaRepo: Repository<AreaEntity>,
  ) {}

  async generateXlsx(filters: ConsolidatedReportFilters): Promise<Buffer> {

    // ── 1. Inspecciones ───────────────────────────────────────────────────────
    const qb = this.inspRepo.createQueryBuilder('i');
    if (filters.site?.trim())        qb.andWhere('UPPER(i.site) = UPPER(:site)',           { site: filters.site.trim() });
    if (filters.reportMonth?.trim()) qb.andWhere('UPPER(i.reportMonth) = UPPER(:month)',   { month: filters.reportMonth.trim() });
    if (filters.reportYear)          qb.andWhere('i.reportYear = :year',                   { year: filters.reportYear });
    if (filters.areaCode?.trim())    qb.andWhere('i.areaCode = :areaCode',                 { areaCode: filters.areaCode.trim() });
    if (filters.leaderCode?.trim())  qb.andWhere('i.leaderCode = :leaderCode',             { leaderCode: filters.leaderCode.trim() });
    const inspections = await qb.orderBy('i.createdAt', 'ASC').getMany();

    // ── 2. Evidencias (primera imagen de informe por inspección) ──────────────
    const codes = inspections.map(i => i.inspectionCode);
    const evidenceMap = new Map<string, string>(); // code → url
    if (codes.length > 0) {
      const evs = await this.respRepo.createQueryBuilder('r')
        .where('r.inspectionCode IN (:...codes)', { codes })
        .andWhere("r.imageType = 'report'")
        .orderBy('r.createdAt', 'ASC')
        .getMany();
      for (const ev of evs) {
        if (!evidenceMap.has(ev.inspectionCode)) evidenceMap.set(ev.inspectionCode, ev.url);
      }
    }

    // ── 3. Descargar imágenes en paralelo (máx 10 concurrentes) ──────────────
    const imageBuffers = new Map<string, { buffer: Buffer; ext: 'jpeg'|'png'|'gif' }>();
    const urlEntries = [...evidenceMap.entries()];
    const BATCH = 10;
    for (let i = 0; i < urlEntries.length; i += BATCH) {
      const batch = urlEntries.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async ([code, url]) => {
          const img = await fetchImageBuffer(url);
          return { code, img };
        }),
      );
      for (const { code, img } of results) {
        if (img) imageBuffers.set(code, img);
        else this.logger.warn(`No se pudo descargar imagen para ${code}`);
      }
    }

    // ── 4. Áreas ──────────────────────────────────────────────────────────────
    const areas = await this.areaRepo.find();
    const areaNames = new Map(areas.map(a => [a.code, a.name]));

    // ── 5. Metadatos ──────────────────────────────────────────────────────────
    const site        = filters.site?.trim() || 'TODOS LOS FUNDOS';
    const month       = filters.reportMonth?.trim().toUpperCase() || '';
    const year        = filters.reportYear ? String(filters.reportYear) : String(new Date().getFullYear());
    const periodLabel = month ? `${month} ${year}` : year;
    const executor    = 'FRANK CARHUATANTA';
    const generatedAt = formatDatePE(new Date());

    // ── 6. Workbook ───────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'RACI - Sistema de Inspecciones';
    wb.created = new Date();

    const ws = wb.addWorksheet('Informe de Inspección', {
      pageSetup: {
        paperSize: 9,
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
      },
      views: [{ state: 'frozen', ySplit: 9 }],
    });

    // Columnas: A=No, B=Foto, C=Descripción, D=Criticidad, E=Conclusión,
    //           F=Área, G=Líder, H=Fecha, I=Comentario, J=Estatus, K=Acción, L=Imagen
    ws.columns = [
      { key: 'no',          width: 5  },
      { key: 'foto',        width: 20 },
      { key: 'descripcion', width: 36 },
      { key: 'criticidad',  width: 10 },
      { key: 'conclusion',  width: 30 },
      { key: 'area',        width: 18 },
      { key: 'lider',       width: 20 },
      { key: 'fecha',       width: 13 },
      { key: 'comentario',  width: 26 },
      { key: 'estatus',     width: 11 },
      { key: 'accion',      width: 26 },
      { key: 'imagen',      width: 20 },
    ];

    // ── 7. Cabecera institucional (filas 1-3) ─────────────────────────────────
    ws.mergeCells('A1:B3');
    this.styledCell(ws, 'A1', 'proserla\npromotora y servicios lambayeque s.a.c.', {
      bold: true, size: 11, color: '1e8449', bg: 'e8f8f5', align: 'center', wrap: true,
    });

    ws.mergeCells('C1:J3');
    this.styledCell(ws, 'C1', 'FORMATO\n\nINFORME INSPECCIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO', {
      bold: true, size: 13, color: WHITE, bg: HEADER_BG, align: 'center', wrap: true,
    });

    ws.mergeCells('K1:L3');
    this.styledCell(ws, 'K1', 'proserla\npromotora y servicios lambayeque s.a.c.', {
      bold: true, size: 11, color: '1e8449', bg: 'e8f8f5', align: 'center', wrap: true,
    });

    ws.getRow(1).height = 20;
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 20;

    // ── 8. Datos del empleador (filas 4-5) ────────────────────────────────────
    ws.mergeCells('A4:B4'); this.headerCell(ws, 'A4', 'RAZÓN SOCIAL');
    this.headerCell(ws, 'C4', 'RUC');
    ws.mergeCells('D4:G4'); this.headerCell(ws, 'D4', 'DOMICILIO');
    ws.mergeCells('H4:I4'); this.headerCell(ws, 'H4', 'TIPO DE ACTIVIDAD');
    ws.mergeCells('J4:L4'); this.headerCell(ws, 'J4', 'N° DE TRABAJADORES');
    ws.getRow(4).height = 16;

    ws.mergeCells('A5:B5');
    this.styledCell(ws, 'A5', 'Promotora y Servicios Lambayeque S.A.C.', { bold: true, size: 9, wrap: true });
    this.styledCell(ws, 'C5', '20479813877', { size: 9, align: 'center' });
    ws.mergeCells('D5:G5');
    this.styledCell(ws, 'D5', 'CAL. ANTOLÍN FLORES NRO. 1580 C.P. VILLA SAN JUAN (CARRETERA PANAMERICANA NORTE KM 37) LAMBAYEQUE - LAMBAYEQUE - JAYANCA', { size: 8, wrap: true });
    ws.mergeCells('H5:I5');
    this.styledCell(ws, 'H5', 'Actividad Agraria', { size: 9, align: 'center' });
    ws.mergeCells('J5:L5');
    this.styledCell(ws, 'J5', '>300 Trabajadores', { size: 9, align: 'center' });
    ws.getRow(5).height = 30;

    // ── 9. Fundo / tipo / ejecutor (fila 6) ───────────────────────────────────
    ws.mergeCells('A6:B6');
    this.richLabelCell(ws, 'A6', 'FUNDO/PLANTA:', site, LIGHT_BLUE);
    ws.mergeCells('C6:D6');
    this.richLabelCell(ws, 'C6', 'RESPONSABLE DEL ESTABLECIMIENTO:', 'TODOS', LIGHT_BLUE);
    this.richLabelCell(ws, 'E6', 'CARGO:', 'LÍDERES DE ÁREA', LIGHT_BLUE);
    ws.mergeCells('F6:G6');
    this.richLabelCell(ws, 'F6', 'TIPO DE INSPECCIÓN:', 'PLANEADA', LIGHT_BLUE);
    ws.mergeCells('H6:I6');
    this.richLabelCell(ws, 'H6', 'EJECUTOR DE LA INSPECCIÓN:', executor, LIGHT_BLUE);
    ws.mergeCells('J6:L6');
    this.richLabelCell(ws, 'J6', 'CARGO:', 'AUXILIAR SST', LIGHT_BLUE);
    ws.getRow(6).height = 18;

    // ── 10. Objetivo (fila 7) ─────────────────────────────────────────────────
    ws.mergeCells('A7:L7');
    this.styledCell(ws, 'A7',
      'OBJETIVO DE LA INSPECCIÓN: Identificar, evaluar y controlar los riesgos presentes en el lugar de trabajo para prevenir accidentes, enfermedades laborales y proteger la integridad de los trabajadores.',
      { size: 9, italic: true, bg: LIGHT_BLUE, wrap: true },
    );
    ws.getRow(7).height = 22;

    // ── 11. Cabecera de columnas (filas 8-9) ──────────────────────────────────
    const colHeaders: [string, string][] = [
      ['A8:A9', 'No.'],
      ['B8:B9', 'EVIDENCIA\nFOTOGRÁFICA'],
      ['C8:C9', 'CONDICIÓN / ACTO\nSUBESTÁNDAR\nDESCRIPCIÓN'],
      ['D8:D9', 'NIVEL DE\nCRITICIDAD\nB-M-A'],
      ['E8:E9', 'CONCLUSIÓN Y\nACCIÓN RECOMENDADA'],
      ['F8:F9', 'ÁREA'],
      ['G8:G9', 'LÍDERES\nDE ÁREA'],
      ['H8:H9', 'FECHA DE\nCUMPLIMIENTO'],
      ['I8:I9', 'COMENTARIO DEL\nÁREA USUARIA'],
      ['J8:J9', 'ESTATUS'],
      ['K8:K9', 'ACCIÓN\nIMPLEMENTADA'],
      ['L8:L9', 'IMAGEN'],
    ];
    for (const [range, label] of colHeaders) {
      ws.mergeCells(range);
      this.colHeader(ws, range.split(':')[0], label);
    }
    ws.getRow(8).height = 14;
    ws.getRow(9).height = 30;

    // ── 12. Filas de datos ────────────────────────────────────────────────────
    // Altura de fila en puntos EMU para imágenes: 80pt ≈ 107px
    const ROW_H_PT = 80;
    // Ancho de columna B y L en caracteres → convertir a EMU para imagen
    // ExcelJS: 1 char ≈ 7px a 96dpi. Col B = 20 chars ≈ 140px
    const IMG_W_PX = 130;
    const IMG_H_PX = 95;

    let rowIdx = 10;
    let counter = 1;

    for (const insp of inspections) {
      const risk       = riskLabel(insp.riskLevel);
      const status     = statusLabel(insp.status);
      const area       = areaNames.get(insp.areaCode) ?? insp.areaCode;
      const imgData    = imageBuffers.get(insp.inspectionCode);
      const rowBg      = counter % 2 === 0 ? 'f0f7ff' : WHITE;

      const cumplDate = insp.reportDay
        ? `${String(insp.reportDay).padStart(2,'0')}/${insp.reportMonth ?? ''}/${insp.reportYear ?? ''}`
        : formatDatePE(new Date(insp.createdAt));

      const row = ws.getRow(rowIdx);
      row.height = ROW_H_PT;

      // A: Número
      this.dataCell(ws, rowIdx, 1, counter, { bold: true, size: 9, align: 'center', bg: rowBg });

      // B: Foto embebida (se agrega después de escribir las celdas)
      this.dataCell(ws, rowIdx, 2, '', { bg: 'f8f9fa' });

      // C: Descripción
      this.dataCell(ws, rowIdx, 3, esc(insp.description), { size: 9, wrap: true, bg: rowBg });

      // D: Criticidad con color
      const riskColor = RISK_COLORS[risk] ?? { bg: WHITE, font: '000000' };
      this.dataCell(ws, rowIdx, 4, risk, { bold: true, size: 9, align: 'center', bg: riskColor.bg, color: riskColor.font });

      // E: Conclusión
      this.dataCell(ws, rowIdx, 5, esc(insp.correctiveMeasures) || esc(insp.comment), { size: 9, wrap: true, bg: rowBg });

      // F: Área
      this.dataCell(ws, rowIdx, 6, area, { size: 9, align: 'center', wrap: true, bg: rowBg });

      // G: Líder
      this.dataCell(ws, rowIdx, 7, esc(insp.leaderCode), { size: 9, align: 'center', wrap: true, bg: rowBg });

      // H: Fecha
      this.dataCell(ws, rowIdx, 8, cumplDate, { size: 9, align: 'center', bg: rowBg });

      // I: Comentario (vacío)
      this.dataCell(ws, rowIdx, 9, '', { bg: rowBg });

      // J: Estatus con color
      const stColor = STATUS_COLORS[status] ?? { bg: WHITE, font: '000000' };
      this.dataCell(ws, rowIdx, 10, status, { bold: true, size: 9, align: 'center', bg: stColor.bg, color: stColor.font });

      // K: Acción implementada (vacío)
      this.dataCell(ws, rowIdx, 11, '', { bg: rowBg });

      // L: Imagen embebida (misma imagen que B)
      this.dataCell(ws, rowIdx, 12, '', { bg: 'f8f9fa' });

      // ── Embeber imagen en columnas B y L ────────────────────────────────────
      if (imgData) {
        try {
          const imgId = wb.addImage({ buffer: imgData.buffer, extension: imgData.ext });

          // Columna B (índice 1, 0-based)
          ws.addImage(imgId, {
            tl: { col: 1, row: rowIdx - 1 },       // top-left (0-based)
            br: { col: 2, row: rowIdx },             // bottom-right
            editAs: 'oneCell',
          });

          // Columna L (índice 11, 0-based)
          ws.addImage(imgId, {
            tl: { col: 11, row: rowIdx - 1 },
            br: { col: 12, row: rowIdx },
            editAs: 'oneCell',
          });
        } catch (err) {
          this.logger.warn(`Error embebiendo imagen para ${insp.inspectionCode}: ${String(err)}`);
        }
      }

      rowIdx++;
      counter++;
    }

    // ── 13. Fila de firma ─────────────────────────────────────────────────────
    rowIdx++;
    ws.mergeCells(`A${rowIdx}:D${rowIdx}`);
    this.richLabelCell(ws, `A${rowIdx}`, 'RESPONSABLE DEL REGISTRO:', executor, LIGHT_BLUE);
    ws.mergeCells(`E${rowIdx}:H${rowIdx}`);
    this.richLabelCell(ws, `E${rowIdx}`, 'FECHA:', generatedAt, LIGHT_BLUE);
    ws.mergeCells(`I${rowIdx}:L${rowIdx}`);
    this.styledCell(ws, `I${rowIdx}`, 'FIRMA: ___________________________', { size: 9, align: 'center', bg: LIGHT_BLUE });
    ws.getRow(rowIdx).height = 22;

    // ── 14. Pie de página ─────────────────────────────────────────────────────
    ws.headerFooter.oddFooter =
      `&L&8Generado por RACI · ${generatedAt}&C&8Informe de Inspección SST — ${site} — ${periodLabel}&R&8Página &P de &N`;

    // ── 15. Serializar ────────────────────────────────────────────────────────
    const raw = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  }

  // ── Helpers de estilo ─────────────────────────────────────────────────────

  private borders(): Partial<ExcelJS.Borders> {
    const s: ExcelJS.BorderStyle = 'thin';
    const c = { argb: '2980b9' };
    return { top: { style: s, color: c }, left: { style: s, color: c }, bottom: { style: s, color: c }, right: { style: s, color: c } };
  }

  private styledCell(
    ws: ExcelJS.Worksheet,
    addr: string,
    value: string,
    opts: {
      bold?: boolean; size?: number; color?: string; bg?: string;
      align?: 'left' | 'center' | 'right'; wrap?: boolean; italic?: boolean;
    } = {},
  ): void {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = {
      name: FONT,
      bold:   opts.bold   ?? false,
      italic: opts.italic ?? false,
      size:   opts.size   ?? 9,
      color:  { argb: opts.color ?? '000000' },
    };
    c.alignment = { vertical: 'middle', horizontal: opts.align ?? 'left', wrapText: opts.wrap ?? false };
    if (opts.bg) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
    c.border = this.borders();
  }

  private headerCell(ws: ExcelJS.Worksheet, addr: string, value: string): void {
    this.styledCell(ws, addr, value, { bold: true, size: 8, color: WHITE, bg: HEADER_BG, align: 'center', wrap: true });
  }

  private colHeader(ws: ExcelJS.Worksheet, addr: string, value: string): void {
    this.styledCell(ws, addr, value, { bold: true, size: 8, color: WHITE, bg: SUB_BG, align: 'center', wrap: true });
  }

  private richLabelCell(ws: ExcelJS.Worksheet, addr: string, label: string, value: string, bg: string): void {
    const c = ws.getCell(addr);
    c.value = {
      richText: [
        { text: label + ' ', font: { name: FONT, bold: true, size: 9 } },
        { text: value,        font: { name: FONT, size: 9 } },
      ],
    };
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    c.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
    c.border = this.borders();
  }

  private dataCell(
    ws: ExcelJS.Worksheet,
    rowIdx: number,
    colIdx: number,
    value: string | number,
    opts: {
      bold?: boolean; size?: number; color?: string; bg?: string;
      align?: 'left' | 'center' | 'right'; wrap?: boolean;
    } = {},
  ): void {
    const c = ws.getRow(rowIdx).getCell(colIdx);
    c.value = value;
    c.font = {
      name:  FONT,
      bold:  opts.bold  ?? false,
      size:  opts.size  ?? 9,
      color: { argb: opts.color ?? '000000' },
    };
    c.alignment = { vertical: 'middle', horizontal: opts.align ?? 'left', wrapText: opts.wrap ?? false };
    if (opts.bg) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.bg } };
    c.border = this.borders();
  }
}
