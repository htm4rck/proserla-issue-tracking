import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { AreaEntity } from '../entity/area.entity';
import { IncidentResponseEntity } from '../entity/incident-response.entity';
import { IncidentEntity } from '../entity/incident.entity';
import { IncidentStatus } from '../enum/incident-status.enum';
import {
  AnnualByAreaResponse,
  MonthlyAreaPoint,
  ReportsAnalyticsResponse,
  ReportsFilterRequest,
  ReportsPeriod,
  ReportsSummaryResponse,
} from '../mapper/reports.mapper';

const MESES = [
  'ENERO',
  'FEBRERO',
  'MARZO',
  'ABRIL',
  'MAYO',
  'JUNIO',
  'JULIO',
  'AGOSTO',
  'SEPTIEMBRE',
  'OCTUBRE',
  'NOVIEMBRE',
  'DICIEMBRE',
] as const;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function fechaReporte(d: Date): string {
  return `${d.getDate()}/${MESES[d.getMonth()]}/${d.getFullYear()}`;
}

function parseReferenceDate(raw?: string): Date {
  if (!raw) return new Date();
  const candidate = new Date(raw);
  return Number.isNaN(candidate.getTime()) ? new Date() : candidate;
}

function formatDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function cleanFilter(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  return trimmed && lower !== 'undefined' && lower !== 'null' ? trimmed : undefined;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(IncidentEntity)
    private readonly incidentRepository: Repository<IncidentEntity>,
    @InjectRepository(IncidentResponseEntity)
    private readonly incidentImageRepository: Repository<IncidentResponseEntity>,
    @InjectRepository(AreaEntity)
    private readonly areaRepository: Repository<AreaEntity>,
  ) {}

  async summary(filters: ReportsFilterRequest): Promise<ReportsSummaryResponse> {
    const incidents = await this.queryIncidents(filters);
    return this.toSummary(incidents);
  }

  async analytics(filters: ReportsFilterRequest): Promise<ReportsAnalyticsResponse> {
    const period = this.normalizePeriod(filters.period);
    const incidents = await this.queryIncidents({ ...filters, period });
    const areaNames = await this.loadAreaNames();
    const summary = this.toSummary(incidents);
    const byStatus = [
      { status: IncidentStatus.OPEN, label: 'Abiertas', value: summary.open },
      { status: IncidentStatus.IN_PROGRESS, label: 'En proceso', value: summary.inProgress },
      { status: IncidentStatus.CLOSED, label: 'Cerradas', value: summary.closed },
    ] as const;

    const byAreaMap = new Map<string, { open: number; inProgress: number; closed: number; total: number }>();
    for (const row of incidents) {
      const current = byAreaMap.get(row.areaCode) ?? {
        open: 0,
        inProgress: 0,
        closed: 0,
        total: 0,
      };
      current.total += 1;
      if (row.status === IncidentStatus.OPEN) current.open += 1;
      if (row.status === IncidentStatus.IN_PROGRESS) current.inProgress += 1;
      if (row.status === IncidentStatus.CLOSED) current.closed += 1;
      byAreaMap.set(row.areaCode, current);
    }

    const byArea = [...byAreaMap.entries()]
      .map(([areaCode, counts]) => ({ areaCode, areaName: areaNames.get(areaCode) ?? areaCode, ...counts }))
      .sort((a, b) => b.total - a.total || a.areaName.localeCompare(b.areaName));

    const range = this.resolveRange(period, filters.referenceDate);
    return {
      summary,
      period,
      rangeLabel: `${formatDate(range.start)} - ${formatDate(range.end)}`,
      byStatus: [...byStatus],
      byArea,
    };
  }

  async annualByArea(year: number, filters: Pick<ReportsFilterRequest, 'areaCode' | 'leaderCode'>): Promise<AnnualByAreaResponse> {
    const qb = this.incidentRepository.createQueryBuilder('incident');
    qb.andWhere(
      '(incident.reportYear = :year OR (incident.reportYear IS NULL AND EXTRACT(YEAR FROM incident.createdAt) = :year))',
      { year },
    );
    if (filters.areaCode?.trim()) {
      qb.andWhere('incident.areaCode = :areaCode', { areaCode: filters.areaCode.trim() });
    }
    if (filters.leaderCode?.trim()) {
      qb.andWhere('incident.leaderCode = :leaderCode', { leaderCode: filters.leaderCode.trim() });
    }
    const incidents = await qb.getMany();
    const areaNames = await this.loadAreaNames();

    // Build map: monthIndex → areaCode → counts
    type Counts = { open: number; inProgress: number; closed: number; total: number };
    const matrix = new Map<number, Map<string, Counts>>();
    for (let m = 1; m <= 12; m++) {
      matrix.set(m, new Map());
    }

    const areaCodes = new Set<string>();
    for (const inc of incidents) {
      const monthIdx = inc.reportMonth
        ? (MESES as readonly string[]).indexOf(inc.reportMonth.trim().toUpperCase()) + 1
        : inc.createdAt.getMonth() + 1;
      const mi = monthIdx > 0 && monthIdx <= 12 ? monthIdx : inc.createdAt.getMonth() + 1;
      const ac = inc.areaCode;
      areaCodes.add(ac);
      const monthMap = matrix.get(mi)!;
      const cur = monthMap.get(ac) ?? { open: 0, inProgress: 0, closed: 0, total: 0 };
      cur.total += 1;
      if (inc.status === IncidentStatus.OPEN) cur.open += 1;
      if (inc.status === IncidentStatus.IN_PROGRESS) cur.inProgress += 1;
      if (inc.status === IncidentStatus.CLOSED) cur.closed += 1;
      monthMap.set(ac, cur);
    }

    const points: MonthlyAreaPoint[] = [];
    for (let mi = 1; mi <= 12; mi++) {
      const monthMap = matrix.get(mi)!;
      for (const ac of areaCodes) {
        const c = monthMap.get(ac) ?? { open: 0, inProgress: 0, closed: 0, total: 0 };
        points.push({
          month: MESES[mi - 1],
          monthIndex: mi,
          areaCode: ac,
          areaName: areaNames.get(ac) ?? ac,
          ...c,
        });
      }
    }

    const areaNameRecord: Record<string, string> = {};
    for (const ac of areaCodes) {
      areaNameRecord[ac] = areaNames.get(ac) ?? ac;
    }

    return {
      year,
      areas: [...areaCodes].sort(),
      areaNames: areaNameRecord,
      months: points,
    };
  }

  async exportCsv(filters: ReportsFilterRequest): Promise<string> {
    const incidents = await this.queryIncidents(filters);
    const areaNames = await this.loadAreaNames();
    const header = [
      'incidentCode',
      'status',
      'areaName',
      'areaCode',
      'leaderCode',
      'riskLevel',
      'incidentType',
      'reportYear',
      'reportMonth',
      'reportDay',
      'reportTime',
      'site',
      'workArea',
      'reportedBy',
      'reportedPerson',
      'employerType',
      'reportSource',
      'createdAt',
    ];

    const rows = incidents.map((i) => [
      i.incidentCode,
      i.status,
      this.areaLabel(i.areaCode, areaNames),
      i.areaCode,
      i.leaderCode ?? '',
      i.riskLevel,
      i.incidentType,
      i.reportYear ?? '',
      i.reportMonth ?? '',
      i.reportDay ?? '',
      i.reportTime ?? '',
      i.site ?? '',
      i.workArea ?? '',
      i.reportedBy,
      i.reportedPerson ?? '',
      i.employerType ?? '',
      i.reportSource ?? '',
      i.createdAt.toISOString(),
    ]);

    return [header, ...rows]
      .map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n');
  }

  async exportExcel(filters: ReportsFilterRequest): Promise<string> {
    const incidents = await this.queryIncidents(filters);
    const areaNames = await this.loadAreaNames();
    const summary = this.toSummary(incidents);
    const generatedAt = formatDate(new Date());

    const rows = incidents
      .map(
        (i) => {
          const stLabel = this.statusLabel(i.status);
          const stClass = i.status === 'open' ? 'st-open' : i.status === 'in_progress' ? 'st-progress' : 'st-closed';
          return `<tr>
          <td>${escapeHtml(i.incidentCode)}</td>
          <td class="${stClass}">${escapeHtml(stLabel)}</td>
          <td>${escapeHtml(this.areaLabel(i.areaCode, areaNames))}</td>
          <td>${escapeHtml(i.leaderCode ?? '')}</td>
          <td>${escapeHtml(fechaReporte(i.createdAt))}</td>
          <td>${escapeHtml(i.reportedBy)}</td>
          <td>${escapeHtml(i.location)}</td>
          <td>${escapeHtml(i.workArea ?? '')}</td>
          <td>${escapeHtml(this.riskLabel(i.riskLevel))}</td>
          <td>${escapeHtml(this.typeLabel(i.incidentType))}</td>
          <td>${escapeHtml(i.description)}</td>
          <td>${escapeHtml(i.correctiveMeasures ?? i.comment ?? '')}</td>
          <td>${escapeHtml(i.assignedTo ?? '')}</td>
        </tr>`;
        },
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; }
    h1 { font-size: 18px; text-align: center; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 6px; vertical-align: top; }
    /* KPIs */
    .kpi-labels td { font-weight: 700; text-align: center; }
    .kpi-open     td { background: #ffcdd2; color: #b71c1c; }
    .kpi-progress td { background: #bbdefb; color: #0d47a1; }
    .kpi-closed   td { background: #c8e6c9; color: #1b5e20; }
    .kpi-total    td { background: #e0e0e0; color: #212121; }
    .kpi-pct      td { background: #ede7f6; color: #4a148c; }
    /* Cabecera de columnas */
    .col-header th { background: #1a237e; color: #fff; text-align: center; font-weight: 700; }
    /* Estado en celda */
    .st-open     { background: #ffcdd2; color: #b71c1c; font-weight: 700; text-align: center; }
    .st-progress { background: #bbdefb; color: #0d47a1; font-weight: 700; text-align: center; }
    .st-closed   { background: #c8e6c9; color: #1b5e20; font-weight: 700; text-align: center; }
  </style>
</head>
<body>
  <h1>Reporte de incidencias</h1>
  <p>Generado: ${escapeHtml(generatedAt)}</p>
  <table>
    <tr class="kpi-labels">
      <td>Abiertas</td><td>En proceso</td><td>Cerradas</td><td>Total</td><td>Cumplimiento</td>
    </tr>
    <tr>
      <td class="kpi-open">${summary.open}</td>
      <td class="kpi-progress">${summary.inProgress}</td>
      <td class="kpi-closed">${summary.closed}</td>
      <td class="kpi-total">${summary.total}</td>
      <td class="kpi-pct">${summary.compliancePct}%</td>
    </tr>
  </table>
  <br />
  <table>
    <thead>
      <tr class="col-header">
        <th>Codigo</th><th>Estado</th><th>Area</th><th>Lider</th><th>Fecha</th><th>Reportante</th><th>Ubicacion</th><th>Area de trabajo</th><th>Riesgo</th><th>Tipo</th><th>Descripcion</th><th>Medidas</th><th>Responsable</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="13">Sin registros</td></tr>'}</tbody>
  </table>
</body>
</html>`;
  }

  /** Libro Excel real (.xlsx), no HTML disfrazado. */
  async exportXlsx(filters: ReportsFilterRequest): Promise<Buffer> {
    const incidents = await this.queryIncidents(filters);
    const areaNames = await this.loadAreaNames();
    const summary = this.toSummary(incidents);
    const generatedAt = formatDate(new Date());

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Issue Tracking';
    const sheet = workbook.addWorksheet('Incidencias', {
      views: [{ state: 'frozen', ySplit: 7 }],
    });

    // ── Título ────────────────────────────────────────────────────────────
    sheet.mergeCells('A1:M1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Reporte de incidencias';
    titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A237E' } };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EAF6' } };

    sheet.mergeCells('A2:M2');
    sheet.getCell('A2').value = `Generado: ${generatedAt}`;
    sheet.getCell('A2').font = { size: 9, color: { argb: 'FF555555' } };

    // ── Fila de KPIs con colores por estado ───────────────────────────────
    const kpiLabels = ['Abiertas', 'En proceso', 'Cerradas', 'Total', 'Cumplimiento %'];
    const kpiValues = [summary.open, summary.inProgress, summary.closed, summary.total, summary.compliancePct];
    const kpiLabelColors = ['FFFFCDD2', 'FFBBDEFB', 'FFC8E6C9', 'FFE0E0E0', 'FFEDE7F6'];
    const kpiTextColors  = ['FFB71C1C', 'FF0D47A1', 'FF1B5E20', 'FF212121', 'FF4A148C'];

    const labelRow = sheet.addRow(kpiLabels);   // row 3
    const valueRow = sheet.addRow(kpiValues);   // row 4

    kpiLabels.forEach((_, colIdx) => {
      const col = colIdx + 1;
      const lCell = labelRow.getCell(col);
      const vCell = valueRow.getCell(col);

      lCell.font = { bold: true, color: { argb: kpiTextColors[colIdx] } };
      lCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiLabelColors[colIdx] } };
      lCell.alignment = { horizontal: 'center' };
      lCell.border = { bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } } };

      vCell.font = { bold: true, size: 13, color: { argb: kpiTextColors[colIdx] } };
      vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: kpiLabelColors[colIdx] } };
      vCell.alignment = { horizontal: 'center' };
    });

    sheet.addRow([]);  // row 5 — separador

    // ── Cabecera de columnas ──────────────────────────────────────────────
    const header = [
      'Codigo', 'Estado', 'Area', 'Lider', 'Fecha',
      'Reportante', 'Ubicacion', 'Area de trabajo',
      'Riesgo', 'Tipo', 'Descripcion', 'Medidas', 'Responsable',
    ];
    const headerRow = sheet.addRow(header);   // row 6
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
    headerRow.alignment = { horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF3949AB' } },
        bottom: { style: 'medium', color: { argb: 'FF3949AB' } },
      };
    });

    // ── Filas de datos con color de estado en la celda "Estado" ──────────
    const statusFill: Record<string, { bg: string; text: string }> = {
      Abierta:    { bg: 'FFFFCDD2', text: 'FFB71C1C' },
      'En proceso': { bg: 'FFBBDEFB', text: 'FF0D47A1' },
      Cerrada:    { bg: 'FFC8E6C9', text: 'FF1B5E20' },
    };

    for (const i of incidents) {
      const statusLabel = this.statusLabel(i.status);
      const dataRow = sheet.addRow([
        i.incidentCode,
        statusLabel,
        this.areaLabel(i.areaCode, areaNames),
        i.leaderCode ?? '',
        fechaReporte(i.createdAt),
        i.reportedBy,
        i.location,
        i.workArea ?? '',
        this.riskLabel(i.riskLevel),
        this.typeLabel(i.incidentType),
        i.description,
        i.correctiveMeasures ?? i.comment ?? '',
        i.assignedTo ?? '',
      ]);

      // Colorear celda de estado (columna B = índice 2)
      const sf = statusFill[statusLabel];
      if (sf) {
        const statusCell = dataRow.getCell(2);
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: sf.bg } };
        statusCell.font = { bold: true, color: { argb: sf.text } };
        statusCell.alignment = { horizontal: 'center' };
      }
    }

    sheet.columns = [
      { width: 14 }, { width: 12 }, { width: 22 }, { width: 12 }, { width: 14 },
      { width: 18 }, { width: 22 }, { width: 16 }, { width: 10 }, { width: 20 },
      { width: 40 }, { width: 36 }, { width: 18 },
    ];

    const raw = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  }

  async exportPdf(filters: ReportsFilterRequest): Promise<Buffer> {
    const incidents = await this.queryIncidents(filters);
    const areaNames = await this.loadAreaNames();
    const codes = [...new Set(incidents.map((i) => i.incidentCode))];
    const firstImageUrl = await this.loadFirstImageUrlByIncident(codes);
    const summary = this.toSummary(incidents);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.font('Helvetica-Bold').fontSize(16).text('Reporte de incidencias', { align: 'center' });
      doc.moveDown(0.4);
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(
          `Abiertas: ${summary.open}   En proceso: ${summary.inProgress}   Cerradas: ${summary.closed}   Total: ${summary.total}   Cumplimiento: ${summary.compliancePct}%`,
          { align: 'center' },
        );
      doc.moveDown(0.8);

      this.writePdfSection(doc, 'ABIERTO', incidents, IncidentStatus.OPEN, areaNames, firstImageUrl);
      this.writePdfSection(doc, 'EN PROCESO', incidents, IncidentStatus.IN_PROGRESS, areaNames, firstImageUrl);
      this.writePdfSection(doc, 'CERRADO', incidents, IncidentStatus.CLOSED, areaNames, firstImageUrl);

      doc.end();
    });
  }

  async exportPrintableHtml(filters: ReportsFilterRequest): Promise<string> {
    const incidents = await this.queryIncidents(filters);
    const areaNames = await this.loadAreaNames();
    const codes = [...new Set(incidents.map((i) => i.incidentCode))];
    const firstImageUrl = await this.loadFirstImageUrlByIncident(codes);

    const byStatus = (st: IncidentStatus) =>
      incidents.filter((i) => i.status === st).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    const open = byStatus(IncidentStatus.OPEN);
    const progress = byStatus(IncidentStatus.IN_PROGRESS);
    const closed = byStatus(IncidentStatus.CLOSED);

    const css = `
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #111; }

      /* ── Cabeceras de sección ── */
      h1.banner {
        text-align: center;
        border-left: 6px solid;
        border-radius: 6px;
        padding: 12px 20px;
        margin: 32px 0 10px;
        font-size: 17px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1.open     { background: #ffebee; color: #c62828; border-color: #e53935; }
      h1.progress { background: #e3f2fd; color: #1565c0; border-color: #1e88e5; }
      h1.closed   { background: #e8f5e9; color: #2e7d32; border-color: #43a047; }

      /* ── Tablas ── */
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
      th, td { border: 1px solid #ccc; padding: 7px 9px; vertical-align: top; }
      td.num { text-align: center; width: 36px; }
      td.img { text-align: center; white-space: nowrap; }
      a.ver  { color: #1565c0; font-weight: 600; }

      /* Cabeceras de tabla por estado */
      tr.th-open     th { background: #ffcdd2; color: #b71c1c; text-align: center; font-weight: 700; }
      tr.th-progress th { background: #bbdefb; color: #0d47a1; text-align: center; font-weight: 700; }
      tr.th-closed   th { background: #c8e6c9; color: #1b5e20; text-align: center; font-weight: 700; }

      /* Filas de datos: franja de color muy suave en la primera columna */
      tbody.open     tr td:first-child { border-left: 3px solid #e53935; }
      tbody.progress tr td:first-child { border-left: 3px solid #1e88e5; }
      tbody.closed   tr td:first-child { border-left: 3px solid #43a047; }

      .muted { color: #555; font-size: 11px; margin-top: 8px; }

      @media print {
        h1.banner { break-before: auto; }
        table { page-break-inside: avoid; }
      }
    `;

    const rowHtml = (rows: IncidentEntity[], variant: 'open' | 'progress' | 'closed'): string => {
      if (rows.length === 0) {
        return '<p class="muted">Sin registros.</p>';
      }
      const thRowClass = `th-${variant}`;
      const head = `<tr class="${thRowClass}"><th>N°</th><th>REPORTANTE</th><th>FECHA</th><th>AREA</th><th>UBICACION</th><th>IMAGEN</th><th>DESCRIPCION</th><th>MEDIDAS</th></tr>`;
      const body = rows
        .map((i, idx) => {
          const url = firstImageUrl.get(i.incidentCode);
          const imgCell = url
            ? `<a class="ver" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Ver</a>`
            : '-';
          return `<tr>
            <td class="num">${idx + 1}</td>
            <td>${escapeHtml(i.reportedBy)}</td>
            <td>${fechaReporte(i.createdAt)}</td>
            <td>${escapeHtml(this.areaLabel(i.areaCode, areaNames))}</td>
            <td>${escapeHtml(i.location)}</td>
            <td class="img">${imgCell}</td>
            <td>${escapeHtml(i.description)}</td>
            <td>${escapeHtml(i.correctiveMeasures ?? i.comment ?? '')}</td>
          </tr>`;
        })
        .join('');
      return `<table><thead>${head}</thead><tbody class="${variant}">${body}</tbody></table>`;
    };

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reporte de incidencias</title>
  <style>${css}</style>
</head>
<body>
  <h1 class="banner open">ABIERTO</h1>
  ${rowHtml(open, 'open')}
  <h1 class="banner progress">EN PROCESO</h1>
  ${rowHtml(progress, 'progress')}
  <h1 class="banner closed">CERRADO</h1>
  ${rowHtml(closed, 'closed')}
  <p class="muted">Generado desde el sistema de gestion de incidencias.</p>
</body>
</html>`;
  }

  private async loadAreaNames(): Promise<Map<string, string>> {
    const areas = await this.areaRepository.find();
    return new Map(areas.map((area) => [area.code, area.name]));
  }

  private areaLabel(areaCode: string, areaNames: Map<string, string>): string {
    return areaNames.get(areaCode) ?? areaCode;
  }

  private async loadFirstImageUrlByIncident(codes: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (codes.length === 0) return map;

    const rows = await this.incidentImageRepository
      .createQueryBuilder('img')
      .where('img.incidentCode IN (:...codes)', { codes })
      .orderBy('img.incidentCode', 'ASC')
      .addOrderBy('img.createdAt', 'ASC')
      .getMany();

    for (const row of rows) {
      if (!map.has(row.incidentCode)) {
        map.set(row.incidentCode, row.url);
      }
    }
    return map;
  }

  private async queryIncidents(filters: ReportsFilterRequest): Promise<IncidentEntity[]> {
    const qb = this.incidentRepository.createQueryBuilder('incident');
    const areaCode = cleanFilter(filters.areaCode);
    const leaderCode = cleanFilter(filters.leaderCode);
    const status = cleanFilter(filters.status);
    const riskLevel = cleanFilter(filters.riskLevel);
    const incidentType = cleanFilter(filters.incidentType);
    const reportMonth = cleanFilter(filters.reportMonth);
    const reportYearRaw = cleanFilter(filters.reportYear);
    const referenceDate = cleanFilter(filters.referenceDate);

    if (areaCode) {
      qb.andWhere('incident.areaCode = :areaCode', { areaCode });
    }

    if (leaderCode) {
      qb.andWhere('incident.leaderCode = :leaderCode', { leaderCode });
    }

    if (status) {
      qb.andWhere('incident.status = :status', { status });
    }

    if (riskLevel) {
      qb.andWhere('incident.riskLevel = :riskLevel', { riskLevel });
    }

    if (incidentType) {
      qb.andWhere('incident.incidentType = :incidentType', { incidentType });
    }

    if (reportMonth) {
      const monthNumber = this.monthNumber(reportMonth);
      qb.andWhere(
        '(UPPER(incident.reportMonth) = :reportMonth OR (incident.reportMonth IS NULL AND EXTRACT(MONTH FROM incident.createdAt) = :monthNumber))',
        {
          reportMonth: reportMonth.toUpperCase(),
          monthNumber,
        },
      );
    }

    if (reportYearRaw) {
      const reportYear = Number(reportYearRaw);
      if (Number.isFinite(reportYear)) {
        qb.andWhere(
          '(incident.reportYear = :reportYear OR (incident.reportYear IS NULL AND EXTRACT(YEAR FROM incident.createdAt) = :reportYear))',
          { reportYear },
        );
      }
    }

    if (filters.period || referenceDate) {
      const period = this.normalizePeriod(filters.period);
      const { start, end } = this.resolveRange(period, referenceDate);
      qb.andWhere('incident.createdAt BETWEEN :start AND :end', { start, end });
    }

    return qb.orderBy('incident.createdAt', 'DESC').getMany();
  }

  private toSummary(incidents: IncidentEntity[]): ReportsSummaryResponse {
    const open = incidents.filter((x) => x.status === IncidentStatus.OPEN).length;
    const inProgress = incidents.filter((x) => x.status === IncidentStatus.IN_PROGRESS).length;
    const closed = incidents.filter((x) => x.status === IncidentStatus.CLOSED).length;
    const total = incidents.length;
    const compliancePct = total > 0 ? Number(((closed / total) * 100).toFixed(2)) : 0;
    return { open, inProgress, closed, total, compliancePct };
  }

  private normalizePeriod(period?: string): ReportsPeriod {
    if (period === 'weekly' || period === 'biweekly' || period === 'yearly') {
      return period;
    }
    return 'monthly';
  }

  private resolveRange(period: ReportsPeriod, referenceDate?: string): { start: Date; end: Date } {
    const ref = parseReferenceDate(referenceDate);
    const end = new Date(ref);
    end.setHours(23, 59, 59, 999);

    if (period === 'yearly') {
      const start = new Date(ref.getFullYear(), 0, 1, 0, 0, 0, 0);
      const last = new Date(ref.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end: last };
    }

    if (period === 'weekly') {
      const day = ref.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const start = new Date(ref);
      start.setDate(ref.getDate() + mondayOffset);
      start.setHours(0, 0, 0, 0);
      const weekEnd = new Date(start);
      weekEnd.setDate(start.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return { start, end: weekEnd };
    }

    if (period === 'biweekly') {
      const firstHalf = ref.getDate() <= 15;
      const start = new Date(ref.getFullYear(), ref.getMonth(), firstHalf ? 1 : 16, 0, 0, 0, 0);
      const endDay = firstHalf ? 15 : new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();
      const halfEnd = new Date(ref.getFullYear(), ref.getMonth(), endDay, 23, 59, 59, 999);
      return { start, end: halfEnd };
    }

    const start = new Date(ref.getFullYear(), ref.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end: monthEnd };
  }

  private monthNumber(raw: string): number {
    const month = raw.trim().toUpperCase();
    const index = MESES.findIndex((name) => name === month);
    return index >= 0 ? index + 1 : Number(month) || 0;
  }

  private statusLabel(status: IncidentStatus): string {
    if (status === IncidentStatus.OPEN) return 'Abierta';
    if (status === IncidentStatus.IN_PROGRESS) return 'En proceso';
    return 'Cerrada';
  }

  private riskLabel(riskLevel: string): string {
    if (riskLevel === 'low') return 'Bajo';
    if (riskLevel === 'high') return 'Alto';
    return 'Medio';
  }

  private typeLabel(incidentType: string): string {
    return incidentType === 'act' ? 'Acto inseguro' : 'Condicion insegura';
  }

  private writePdfSection(
    doc: PDFKit.PDFDocument,
    title: string,
    incidents: IncidentEntity[],
    status: IncidentStatus,
    areaNames: Map<string, string>,
    firstImageUrl: Map<string, string>,
  ): void {
    // Colores por estado
    const palette: Record<string, { bg: string; text: string; headerBg: string; headerText: string; accent: string }> = {
      ABIERTO:    { bg: '#FFEBEE', text: '#C62828', headerBg: '#FFCDD2', headerText: '#B71C1C', accent: '#E53935' },
      'EN PROCESO': { bg: '#E3F2FD', text: '#1565C0', headerBg: '#BBDEFB', headerText: '#0D47A1', accent: '#1E88E5' },
      CERRADO:    { bg: '#E8F5E9', text: '#2E7D32', headerBg: '#C8E6C9', headerText: '#1B5E20', accent: '#43A047' },
    };
    const colors = palette[title] ?? { bg: '#F5F5F5', text: '#111111', headerBg: '#E0E0E0', headerText: '#111111', accent: '#9E9E9E' };

    const rows = incidents
      .filter((incident) => incident.status === status)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    this.ensurePdfSpace(doc, 44);

    // ── Cabecera de sección con color ──────────────────────────────────────
    const pageW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bannerH = 26;
    doc
      .roundedRect(doc.page.margins.left, doc.y, pageW, bannerH, 5)
      .fillColor(colors.bg)
      .fill();
    // Borde izquierdo de acento
    doc
      .rect(doc.page.margins.left, doc.y, 5, bannerH)
      .fillColor(colors.accent)
      .fill();
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(colors.text)
      .text(title, doc.page.margins.left + 12, doc.y - bannerH + 8, { width: pageW - 16 });
    doc.y += 6;
    doc.moveDown(0.4);

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#555555').text('Sin registros.');
      doc.moveDown(0.8);
      return;
    }

    rows.forEach((incident, idx) => {
      this.ensurePdfSpace(doc, 82);
      const top = doc.y;
      // Borde de la tarjeta
      doc.roundedRect(doc.page.margins.left, top, pageW, 70, 4).strokeColor('#cccccc').stroke();
      // Franja de color en el borde izquierdo de la tarjeta
      doc.rect(doc.page.margins.left, top, 4, 70).fillColor(colors.accent).fill();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#111111')
        .text(
          `${idx + 1}. ${incident.incidentCode} | ${fechaReporte(incident.createdAt)} | ${this.areaLabel(
            incident.areaCode,
            areaNames,
          )} | ${this.riskLabel(incident.riskLevel)}`,
          doc.page.margins.left + 10,
          top + 7,
          { width: pageW - 18 },
        );
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#333333')
        .text(`Reportante: ${incident.reportedBy}    Ubicacion: ${incident.location}`, {
          width: pageW - 18,
        })
        .text(`Descripcion: ${incident.description}`, { width: pageW - 18 })
        .text(`Medidas: ${incident.correctiveMeasures ?? incident.comment ?? '-'}`, { width: pageW - 18 });
      const imgUrl = firstImageUrl.get(incident.incidentCode);
      if (imgUrl) {
        doc.fillColor('#1d4ed8').text(`Imagen: ${imgUrl}`, { width: pageW - 18 });
      }
      doc.fillColor('#111111');
      doc.y = top + 78;
    });
    doc.moveDown(0.5);
  }

  private ensurePdfSpace(doc: PDFKit.PDFDocument, height: number): void {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + height > bottom) {
      doc.addPage();
    }
  }
}
