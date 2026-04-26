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
        (i) => `<tr>
          <td>${escapeHtml(i.incidentCode)}</td>
          <td>${escapeHtml(this.statusLabel(i.status))}</td>
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
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, Helvetica, sans-serif; }
    h1 { font-size: 18px; text-align: center; }
    .summary td { font-weight: 700; background: #d9ead3; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #333; padding: 6px; vertical-align: top; }
    th { background: #d9eaf7; font-weight: 700; text-align: center; }
  </style>
</head>
<body>
  <h1>Reporte de incidencias</h1>
  <p>Generado: ${escapeHtml(generatedAt)}</p>
  <table class="summary">
    <tr><td>Abiertas</td><td>En proceso</td><td>Cerradas</td><td>Total</td><td>Cumplimiento</td></tr>
    <tr><td>${summary.open}</td><td>${summary.inProgress}</td><td>${summary.closed}</td><td>${summary.total}</td><td>${summary.compliancePct}%</td></tr>
  </table>
  <br />
  <table>
    <thead>
      <tr>
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
      views: [{ state: 'frozen', ySplit: 4 }],
    });

    sheet.getCell('A1').value = 'Reporte de incidencias';
    sheet.getCell('A1').font = { bold: true, size: 14 };
    sheet.getCell('A2').value = `Generado: ${generatedAt}`;

    sheet.addRow(['Abiertas', 'En proceso', 'Cerradas', 'Total', 'Cumplimiento %']);
    sheet.addRow([summary.open, summary.inProgress, summary.closed, summary.total, summary.compliancePct]);
    sheet.getRow(3).font = { bold: true };
    sheet.addRow([]);

    const header = [
      'Codigo',
      'Estado',
      'Area',
      'Lider',
      'Fecha',
      'Reportante',
      'Ubicacion',
      'Area de trabajo',
      'Riesgo',
      'Tipo',
      'Descripcion',
      'Medidas',
      'Responsable',
    ];
    const headerRow = sheet.addRow(header);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD9EAF7' },
    };

    for (const i of incidents) {
      sheet.addRow([
        i.incidentCode,
        this.statusLabel(i.status),
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
    }

    sheet.columns = [
      { width: 14 },
      { width: 12 },
      { width: 22 },
      { width: 12 },
      { width: 18 },
      { width: 18 },
      { width: 22 },
      { width: 16 },
      { width: 10 },
      { width: 20 },
      { width: 40 },
      { width: 36 },
      { width: 18 },
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
      h1.banner { text-align: center; border: 2px solid #111; padding: 10px 16px; margin: 28px 0 12px; font-size: 18px; letter-spacing: 0.05em; }
      h1.open { background: #f5f0e6; }
      h1.progress { background: #f5f0e6; }
      h1.closed { background: #c8e6c9; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 12px; }
      th, td { border: 1px solid #222; padding: 8px; vertical-align: top; }
      th { background: #e8dcc4; text-align: center; font-weight: 700; }
      tr.closed th { background: #b2dfdb; }
      td.num { text-align: center; width: 40px; }
      td.img { text-align: center; white-space: nowrap; }
      a.ver { color: #1565c0; font-weight: 600; }
      .muted { color: #555; font-size: 11px; margin-top: 8px; }
    `;

    const rowHtml = (rows: IncidentEntity[], variant: 'open' | 'progress' | 'closed'): string => {
      if (rows.length === 0) {
        return '<p class="muted">Sin registros.</p>';
      }
      const thClass = variant === 'closed' ? 'closed' : '';
      const head = `<tr class="${thClass}"><th>N°</th><th>REPORTANTE</th><th>FECHA</th><th>AREA</th><th>UBICACION</th><th>IMAGEN</th><th>DESCRIPCION</th><th>MEDIDAS</th></tr>`;
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
      return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
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
    const rows = incidents
      .filter((incident) => incident.status === status)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    this.ensurePdfSpace(doc, 44);
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#111111').text(title);
    doc.moveDown(0.3);

    if (rows.length === 0) {
      doc.font('Helvetica').fontSize(9).fillColor('#555555').text('Sin registros.');
      doc.moveDown(0.8);
      return;
    }

    rows.forEach((incident, idx) => {
      this.ensurePdfSpace(doc, 82);
      const top = doc.y;
      doc.roundedRect(doc.page.margins.left, top, doc.page.width - 72, 70, 4).strokeColor('#cccccc').stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8.5)
        .fillColor('#111111')
        .text(
          `${idx + 1}. ${incident.incidentCode} | ${fechaReporte(incident.createdAt)} | ${this.areaLabel(
            incident.areaCode,
            areaNames,
          )} | ${this.riskLabel(incident.riskLevel)}`,
          doc.page.margins.left + 8,
          top + 7,
          { width: doc.page.width - 88 },
        );
      doc
        .font('Helvetica')
        .fontSize(8)
        .text(`Reportante: ${incident.reportedBy}    Ubicacion: ${incident.location}`, {
          width: doc.page.width - 88,
        })
        .text(`Descripcion: ${incident.description}`, { width: doc.page.width - 88 })
        .text(`Medidas: ${incident.correctiveMeasures ?? incident.comment ?? '-'}`, { width: doc.page.width - 88 });
      const imgUrl = firstImageUrl.get(incident.incidentCode);
      if (imgUrl) {
        doc.fillColor('#1d4ed8').text(`Imagen: ${imgUrl}`, { width: doc.page.width - 88 });
      }
      doc.fillColor('#111111');
      doc.y = top + 78;
    });
  }

  private ensurePdfSpace(doc: PDFKit.PDFDocument, height: number): void {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + height > bottom) {
      doc.addPage();
    }
  }
}
