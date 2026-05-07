import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import ExcelJS from 'exceljs';
import { InspectionEntity } from '../entity/inspection.entity';
import { InspectionResponseEntity } from '../entity/inspection-response.entity';
import { AreaEntity } from '../entity/area.entity';

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(v: unknown): string {
  return String(v ?? '').trim();
}

function riskLabel(r: string): string {
  if (r === 'low') return 'BAJO';
  if (r === 'medium') return 'MEDIO';
  if (r === 'high') return 'ALTO';
  return r.toUpperCase();
}

function statusLabel(s: string): string {
  if (s === 'open') return 'ABIERTO';
  if (s === 'in_progress') return 'PROCESO';
  if (s === 'closed') return 'CERRADO';
  return s.toUpperCase();
}

function typeLabel(t: string): string {
  if (t === 'act') return 'Acto inseguro';
  if (t === 'condition') return 'Condición insegura';
  if (t === 'mixed') return 'Mixto';
  return t;
}

function formatDatePE(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

// ── Paleta de colores ─────────────────────────────────────────────────────────
const DARK_BLUE  = '1a3a5c';
const MID_BLUE   = '1f618d';
const LIGHT_BLUE = 'd6eaf8';
const HEADER_BG  = '1a3a5c';
const SUB_BG     = '2e86c1';
const WHITE      = 'FFFFFF';

const RISK_COLORS: Record<string, { bg: string; font: string }> = {
  BAJO:  { bg: 'FFFF00', font: '000000' },
  MEDIO: { bg: 'FF8C00', font: 'FFFFFF' },
  ALTO:  { bg: 'FF0000', font: 'FFFFFF' },
};

const STATUS_COLORS: Record<string, { bg: string; font: string }> = {
  ABIERTO: { bg: 'FF0000', font: 'FFFFFF' },
  PROCESO: { bg: 'FFA500', font: 'FFFFFF' },
  CERRADO: { bg: '00B050', font: 'FFFFFF' },
};

// ── Tipos internos ────────────────────────────────────────────────────────────
export interface ConsolidatedReportFilters {
  site?: string;
  reportMonth?: string;
  reportYear?: number;
  areaCode?: string;
  leaderCode?: string;
}

@Injectable()
export class InspectionConsolidatedReportService {
  constructor(
    @InjectRepository(InspectionEntity)
    private readonly inspRepo: Repository<InspectionEntity>,
    @InjectRepository(InspectionResponseEntity)
    private readonly respRepo: Repository<InspectionResponseEntity>,
    @InjectRepository(AreaEntity)
    private readonly areaRepo: Repository<AreaEntity>,
  ) {}

  async generateXlsx(filters: ConsolidatedReportFilters): Promise<Buffer> {
    // ── 1. Cargar inspecciones ────────────────────────────────────────────────
    const qb = this.inspRepo.createQueryBuilder('i');

    if (filters.site?.trim()) {
      qb.andWhere('UPPER(i.site) = UPPER(:site)', { site: filters.site.trim() });
    }
    if (filters.reportMonth?.trim()) {
      qb.andWhere('UPPER(i.reportMonth) = UPPER(:month)', { month: filters.reportMonth.trim() });
    }
    if (filters.reportYear) {
      qb.andWhere('i.reportYear = :year', { year: filters.reportYear });
    }
    if (filters.areaCode?.trim()) {
      qb.andWhere('i.areaCode = :areaCode', { areaCode: filters.areaCode.trim() });
    }
    if (filters.leaderCode?.trim()) {
      qb.andWhere('i.leaderCode = :leaderCode', { leaderCode: filters.leaderCode.trim() });
    }

    const inspections = await qb.orderBy('i.createdAt', 'ASC').getMany();

    // ── 2. Cargar evidencias (primera imagen de informe por inspección) ────────
    const codes = inspections.map((i) => i.inspectionCode);
    const evidenceMap = new Map<string, string>(); // code → url primera imagen

    if (codes.length > 0) {
      const evs = await this.respRepo
        .createQueryBuilder('r')
        .where('r.inspectionCode IN (:...codes)', { codes })
        .andWhere("r.imageType = 'report'")
        .orderBy('r.createdAt', 'ASC')
        .getMany();

      for (const ev of evs) {
        if (!evidenceMap.has(ev.inspectionCode)) {
          evidenceMap.set(ev.inspectionCode, ev.url);
        }
      }
    }

    // ── 3. Cargar nombres de área ─────────────────────────────────────────────
    const areas = await this.areaRepo.find();
    const areaNames = new Map(areas.map((a) => [a.code, a.name]));

    // ── 4. Metadatos del reporte ──────────────────────────────────────────────
    const site       = filters.site?.trim() || 'TODOS LOS FUNDOS';
    const month      = filters.reportMonth?.trim().toUpperCase() || '';
    const year       = filters.reportYear ? String(filters.reportYear) : String(new Date().getFullYear());
    const periodLabel = month ? `${month} ${year}` : year;
    const executor   = 'FRANK CARHUATANTA';
    const generatedAt = formatDatePE(new Date());

    // ── 5. Crear workbook ─────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'RACI - Sistema de Inspecciones';
    wb.created = new Date();

    const ws = wb.addWorksheet('Informe de Inspección', {
      pageSetup: {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      views: [{ state: 'frozen', ySplit: 6 }],
    });

    // ── 6. Anchos de columna ──────────────────────────────────────────────────
    // A=No, B=Foto, C=Descripción, D=Criticidad, E=Conclusión, F=Área, G=Líder, H=Fecha, I=Comentario, J=Estatus, K=Acción, L=Imagen
    ws.columns = [
      { key: 'no',          width: 5  },   // A
      { key: 'foto',        width: 18 },   // B
      { key: 'descripcion', width: 38 },   // C
      { key: 'criticidad',  width: 10 },   // D
      { key: 'conclusion',  width: 32 },   // E
      { key: 'area',        width: 20 },   // F
      { key: 'lider',       width: 22 },   // G
      { key: 'fecha',       width: 14 },   // H
      { key: 'comentario',  width: 28 },   // I
      { key: 'estatus',     width: 12 },   // J
      { key: 'accion',      width: 28 },   // K
      { key: 'imagen',      width: 18 },   // L
    ];

    // ── 7. Fila 1: Logo + Título + Logo derecho ───────────────────────────────
    ws.mergeCells('A1:B3');
    const logoCell = ws.getCell('A1');
    logoCell.value = 'proserla\npromotora y servicios lambayeque s.a.c.';
    logoCell.font = { name: 'Arial', bold: true, size: 11, color: { argb: '1e8449' } };
    logoCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    logoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'e8f8f5' } };
    logoCell.border = this.allBorders();

    ws.mergeCells('C1:J3');
    const titleCell = ws.getCell('C1');
    titleCell.value = 'FORMATO\n\nINFORME INSPECCIÓN DE SEGURIDAD Y SALUD EN EL TRABAJO';
    titleCell.font = { name: 'Arial', bold: true, size: 13, color: { argb: WHITE } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    titleCell.border = this.allBorders();

    ws.mergeCells('K1:L3');
    const logo2Cell = ws.getCell('K1');
    logo2Cell.value = 'proserla\npromotora y servicios lambayeque s.a.c.';
    logo2Cell.font = { name: 'Arial', bold: true, size: 11, color: { argb: '1e8449' } };
    logo2Cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    logo2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'e8f8f5' } };
    logo2Cell.border = this.allBorders();

    ws.getRow(1).height = 20;
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 20;

    // ── 8. Fila 4: Datos del empleador ────────────────────────────────────────
    ws.mergeCells('A4:B4');
    this.headerCell(ws, 'A4', 'RAZÓN SOCIAL');
    ws.mergeCells('C4:C4');
    this.headerCell(ws, 'C4', 'RUC');
    ws.mergeCells('D4:G4');
    this.headerCell(ws, 'D4', 'DOMICILIO');
    ws.mergeCells('H4:I4');
    this.headerCell(ws, 'H4', 'TIPO DE ACTIVIDAD');
    ws.mergeCells('J4:L4');
    this.headerCell(ws, 'J4', 'N° DE TRABAJADORES');
    ws.getRow(4).height = 16;

    ws.mergeCells('A5:B5');
    this.dataCell(ws, 'A5', 'Promotora y Servicios Lambayeque S.A.C.', true);
    this.dataCell(ws, 'C5', '20479813877');
    ws.mergeCells('D5:G5');
    this.dataCell(ws, 'D5', 'CAL. ANTOLÍN FLORES NRO. 1580 C.P. VILLA SAN JUAN (CARRETERA PANAMERICANA NORTE KM 37) LAMBAYEQUE - LAMBAYEQUE - JAYANCA');
    ws.mergeCells('H5:I5');
    this.dataCell(ws, 'H5', 'Actividad Agraria');
    ws.mergeCells('J5:L5');
    this.dataCell(ws, 'J5', '>300 Trabajadores');
    ws.getRow(5).height = 30;

    // ── 9. Fila 6: Fundo, responsable, tipo, objetivo ─────────────────────────
    ws.mergeCells('A6:B6');
    this.labelValueCell(ws, 'A6', 'FUNDO/PLANTA:', site);
    ws.mergeCells('C6:D6');
    this.labelValueCell(ws, 'C6', 'RESPONSABLE DEL ESTABLECIMIENTO:', 'TODOS');
    this.labelValueCell(ws, 'E6', 'CARGO:', 'LÍDERES DE ÁREA');
    ws.mergeCells('F6:G6');
    this.labelValueCell(ws, 'F6', 'TIPO DE INSPECCIÓN:', 'PLANEADA');
    ws.mergeCells('H6:I6');
    this.labelValueCell(ws, 'H6', 'EJECUTOR DE LA INSPECCIÓN:', executor);
    ws.mergeCells('J6:L6');
    this.labelValueCell(ws, 'J6', 'CARGO:', 'AUXILIAR SST');
    ws.getRow(6).height = 18;

    // ── 10. Fila 7: Objetivo ──────────────────────────────────────────────────
    ws.mergeCells('A7:L7');
    const objCell = ws.getCell('A7');
    objCell.value = 'OBJETIVO DE LA INSPECCIÓN: Identificar, evaluar y controlar los riesgos presentes en el lugar de trabajo para prevenir accidentes, enfermedades laborales y proteger la integridad de los trabajadores.';
    objCell.font = { name: 'Arial', size: 9, italic: true };
    objCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    objCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    objCell.border = this.allBorders();
    ws.getRow(7).height = 22;

    // ── 11. Fila 8: Cabecera de columnas ──────────────────────────────────────
    ws.mergeCells('A8:A9');
    this.colHeader(ws, 'A8', 'No.');
    ws.mergeCells('B8:B9');
    this.colHeader(ws, 'B8', 'EVIDENCIA\nFOTOGRÁFICA');
    ws.mergeCells('C8:C9');
    this.colHeader(ws, 'C8', 'CONDICIÓN / ACTO\nSUBESTÁNDAR\nDESCRIPCIÓN');
    ws.mergeCells('D8:D9');
    this.colHeader(ws, 'D8', 'NIVEL DE\nCRITICIDAD\nB-M-A');
    ws.mergeCells('E8:E9');
    this.colHeader(ws, 'E8', 'CONCLUSIÓN Y\nACCIÓN RECOMENDADA');
    ws.mergeCells('F8:F9');
    this.colHeader(ws, 'F8', 'ÁREA');
    ws.mergeCells('G8:G9');
    this.colHeader(ws, 'G8', 'LÍDERES\nDE ÁREA');
    ws.mergeCells('H8:H9');
    this.colHeader(ws, 'H8', 'FECHA DE\nCUMPLIMIENTO');
    ws.mergeCells('I8:I9');
    this.colHeader(ws, 'I8', 'COMENTARIO DEL\nÁREA USUARIA');
    ws.mergeCells('J8:J9');
    this.colHeader(ws, 'J8', 'ESTATUS');
    ws.mergeCells('K8:K9');
    this.colHeader(ws, 'K8', 'ACCIÓN\nIMPLEMENTADA');
    ws.mergeCells('L8:L9');
    this.colHeader(ws, 'L8', 'IMAGEN');
    ws.getRow(8).height = 14;
    ws.getRow(9).height = 28;

    // ── 12. Filas de datos ────────────────────────────────────────────────────
    let rowIdx = 10;
    let counter = 1;

    for (const insp of inspections) {
      const risk    = riskLabel(insp.riskLevel);
      const status  = statusLabel(insp.status);
      const area    = areaNames.get(insp.areaCode) ?? insp.areaCode;
      const imgUrl  = evidenceMap.get(insp.inspectionCode) ?? '';

      // Fecha de cumplimiento: reportDay/Month/Year o createdAt
      const cumplDate = insp.reportDay
        ? `${String(insp.reportDay).padStart(2, '0')}/${insp.reportMonth ?? ''}/${insp.reportYear ?? ''}`
        : formatDatePE(new Date(insp.createdAt));

      const row = ws.getRow(rowIdx);
      row.height = 80; // altura para foto

      // A: Número
      const cellNo = row.getCell(1);
      cellNo.value = counter;
      cellNo.font = { name: 'Arial', bold: true, size: 9 };
      cellNo.alignment = { vertical: 'middle', horizontal: 'center' };
      cellNo.border = this.allBorders();
      cellNo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: counter % 2 === 0 ? 'f2f9ff' : WHITE } };

      // B: Foto (placeholder con URL si existe)
      const cellFoto = row.getCell(2);
      cellFoto.value = imgUrl ? { text: 'Ver foto', hyperlink: imgUrl } : '';
      cellFoto.font = { name: 'Arial', size: 8, color: { argb: imgUrl ? '1a5276' : '999999' }, underline: !!imgUrl };
      cellFoto.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cellFoto.border = this.allBorders();
      cellFoto.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'f8f9fa' } };

      // C: Descripción
      const cellDesc = row.getCell(3);
      cellDesc.value = esc(insp.description);
      cellDesc.font = { name: 'Arial', size: 9 };
      cellDesc.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cellDesc.border = this.allBorders();

      // D: Criticidad con color
      const cellRisk = row.getCell(4);
      cellRisk.value = risk;
      const riskColor = RISK_COLORS[risk] ?? { bg: 'FFFFFF', font: '000000' };
      cellRisk.font = { name: 'Arial', bold: true, size: 9, color: { argb: riskColor.font } };
      cellRisk.alignment = { vertical: 'middle', horizontal: 'center' };
      cellRisk.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: riskColor.bg } };
      cellRisk.border = this.allBorders();

      // E: Conclusión / acción recomendada
      const cellConc = row.getCell(5);
      cellConc.value = esc(insp.correctiveMeasures) || esc(insp.comment);
      cellConc.font = { name: 'Arial', size: 9 };
      cellConc.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      cellConc.border = this.allBorders();

      // F: Área
      const cellArea = row.getCell(6);
      cellArea.value = area;
      cellArea.font = { name: 'Arial', size: 9 };
      cellArea.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cellArea.border = this.allBorders();

      // G: Líder
      const cellLider = row.getCell(7);
      cellLider.value = esc(insp.leaderCode);
      cellLider.font = { name: 'Arial', size: 9 };
      cellLider.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cellLider.border = this.allBorders();

      // H: Fecha de cumplimiento
      const cellFecha = row.getCell(8);
      cellFecha.value = cumplDate;
      cellFecha.font = { name: 'Arial', size: 9 };
      cellFecha.alignment = { vertical: 'middle', horizontal: 'center' };
      cellFecha.border = this.allBorders();

      // I: Comentario del área usuaria (vacío — para llenar manualmente)
      const cellComent = row.getCell(9);
      cellComent.value = '';
      cellComent.border = this.allBorders();

      // J: Estatus con color
      const cellStatus = row.getCell(10);
      cellStatus.value = status;
      const stColor = STATUS_COLORS[status] ?? { bg: 'FFFFFF', font: '000000' };
      cellStatus.font = { name: 'Arial', bold: true, size: 9, color: { argb: stColor.font } };
      cellStatus.alignment = { vertical: 'middle', horizontal: 'center' };
      cellStatus.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stColor.bg } };
      cellStatus.border = this.allBorders();

      // K: Acción implementada (vacío — para llenar manualmente)
      const cellAccion = row.getCell(11);
      cellAccion.value = '';
      cellAccion.border = this.allBorders();

      // L: Imagen (URL como hipervínculo)
      const cellImg = row.getCell(12);
      cellImg.value = imgUrl ? { text: 'Ver imagen', hyperlink: imgUrl } : '';
      cellImg.font = { name: 'Arial', size: 8, color: { argb: imgUrl ? '1a5276' : '999999' }, underline: !!imgUrl };
      cellImg.alignment = { vertical: 'middle', horizontal: 'center' };
      cellImg.border = this.allBorders();

      rowIdx++;
      counter++;
    }

    // ── 13. Fila de firma ─────────────────────────────────────────────────────
    rowIdx++;
    ws.mergeCells(`A${rowIdx}:D${rowIdx}`);
    const firmResp = ws.getCell(`A${rowIdx}`);
    firmResp.value = `RESPONSABLE DEL REGISTRO: ${executor}`;
    firmResp.font = { name: 'Arial', bold: true, size: 9 };
    firmResp.alignment = { vertical: 'middle', horizontal: 'left' };
    firmResp.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    firmResp.border = this.allBorders();

    ws.mergeCells(`E${rowIdx}:H${rowIdx}`);
    const firmFecha = ws.getCell(`E${rowIdx}`);
    firmFecha.value = `FECHA: ${generatedAt}`;
    firmFecha.font = { name: 'Arial', size: 9 };
    firmFecha.alignment = { vertical: 'middle', horizontal: 'center' };
    firmFecha.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    firmFecha.border = this.allBorders();

    ws.mergeCells(`I${rowIdx}:L${rowIdx}`);
    const firmFirma = ws.getCell(`I${rowIdx}`);
    firmFirma.value = 'FIRMA: ___________________________';
    firmFirma.font = { name: 'Arial', size: 9 };
    firmFirma.alignment = { vertical: 'middle', horizontal: 'center' };
    firmFirma.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    firmFirma.border = this.allBorders();
    ws.getRow(rowIdx).height = 22;

    // ── 14. Pie de página ─────────────────────────────────────────────────────
    ws.headerFooter.oddFooter = `&L&8Generado por RACI · ${generatedAt}&C&8Informe de Inspección SST — ${site} — ${periodLabel}&R&8Página &P de &N`;

    // ── 15. Serializar ────────────────────────────────────────────────────────
    const raw = await wb.xlsx.writeBuffer();
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  }

  // ── Helpers de estilo ─────────────────────────────────────────────────────

  private allBorders(): Partial<ExcelJS.Borders> {
    const s: ExcelJS.BorderStyle = 'thin';
    return {
      top:    { style: s, color: { argb: '2980b9' } },
      left:   { style: s, color: { argb: '2980b9' } },
      bottom: { style: s, color: { argb: '2980b9' } },
      right:  { style: s, color: { argb: '2980b9' } },
    };
  }

  private headerCell(ws: ExcelJS.Worksheet, addr: string, value: string): void {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = { name: 'Arial', bold: true, size: 8, color: { argb: WHITE } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
    c.border = this.allBorders();
  }

  private dataCell(ws: ExcelJS.Worksheet, addr: string, value: string, bold = false): void {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = { name: 'Arial', bold, size: 9 };
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    c.border = this.allBorders();
  }

  private labelValueCell(ws: ExcelJS.Worksheet, addr: string, label: string, value: string): void {
    const c = ws.getCell(addr);
    c.value = `${label} ${value}`;
    c.font = { name: 'Arial', size: 9 };
    c.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
    c.border = { ...this.allBorders() };
    // Label en negrita usando rich text
    c.value = {
      richText: [
        { text: label + ' ', font: { name: 'Arial', bold: true, size: 9 } },
        { text: value,        font: { name: 'Arial', size: 9 } },
      ],
    };
  }

  private colHeader(ws: ExcelJS.Worksheet, addr: string, value: string): void {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = { name: 'Arial', bold: true, size: 8, color: { argb: WHITE } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUB_BG } };
    c.border = this.allBorders();
  }
}
