import { Component, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Area, Leader } from '../../core/models/api.models';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { MONTH_OPTIONS, yearOptions } from '../../shared/temporal-options';

interface BarItem {
  label: string;
  value: number;
  pct: number;
  colorClass: string;
}

@Component({
  selector: 'app-reports-page',
  imports: [ReactiveFormsModule],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
})
export class ReportsPageComponent implements OnInit {
  private readonly api   = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb    = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly form = this.fb.nonNullable.group({
    areaCode:     [this.session.scopedFilters().areaCode   ?? ''],
    leaderCode:   [this.session.scopedFilters().leaderCode ?? ''],
    status:       [''],
    riskLevel:    [''],
    inspectionType: [''],
    reportMonth:  [''],
    reportYear:   [String(new Date().getFullYear())],
  });

  // -- Estado --------------------------------------------------------------
  loading       = false;
  generated     = false;
  summary: { open: number; inProgress: number; closed: number; total: number; compliancePct: number } | null = null;

  // Barras calculadas
  statusBars:  BarItem[] = [];
  riskBars:    BarItem[] = [];
  typeBars:    BarItem[] = [];

  // Descargas
  csvUrl        = '';
  pdfUrl        = '';
  tableHtmlUrl  = '';
  previewHtmlUrl: SafeResourceUrl | null = null;
  showHtmlPreview = false;
  xlsxBusy      = false;
  xlsxError     = '';
  pdfBusy       = false;
  csvBusy       = false;
  consolidatedBusy = false;

  private lastReportParams: Record<string, string | undefined> = {};

  // Cat�logos
  areas:   Area[]   = [];
  leaders: Leader[] = [];
  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions  = yearOptions(2020);

  // -- Helpers -------------------------------------------------------------

  get leadersForArea(): Leader[] {
    const ac = this.form.controls.areaCode.value?.trim();
    if (!ac) return this.leaders.filter(l => l.isActive);
    return this.leaders.filter(l => l.isActive && l.areaCode === ac);
  }

  // -- Lifecycle ------------------------------------------------------------

  ngOnInit(): void {
    this.api.listAreas().subscribe(({ data }) => (this.areas = data ?? []));
    this.api.listLeaders().subscribe(({ data }) => (this.leaders = data ?? []));

    if (this.session.user?.roleCode === 'leader') {
      this.form.controls.areaCode.disable();
      this.form.controls.leaderCode.disable();
    }

    // Auto-limpiar l�der si cambia �rea
    this.form.controls.areaCode.valueChanges.subscribe(ac => {
      const cur = this.form.controls.leaderCode.value?.trim();
      if (cur) {
        const ok = this.leaders.some(l => l.isActive && l.areaCode === ac && l.code === cur);
        if (!ok) this.form.controls.leaderCode.setValue('', { emitEvent: false });
      }
      if (ac) {
        const inArea = this.leaders.filter(l => l.isActive && l.areaCode === ac);
        if (inArea.length === 1) {
          this.form.controls.leaderCode.setValue(inArea[0].code, { emitEvent: false });
        }
      }
    });
  }

  // -- Generar --------------------------------------------------------------

  run(): void {
    const raw = this.form.getRawValue();
    const q = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, String(v).trim() || undefined]),
    ) as Record<string, string | undefined>;

    this.lastReportParams = q;
    this.xlsxError = '';
    this.loading = true;
    this.generated = false;

    this.api.reportsSummary(q)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ data }) => {
          this.summary = data;
          this.buildBars(data);
          this.csvUrl       = this.api.reportsCsvUrl(q);
          this.pdfUrl       = this.api.reportsPdfUrl(q);
          this.tableHtmlUrl = this.api.reportsTableHtmlUrl(q);
          this.previewHtmlUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.tableHtmlUrl);
          this.showHtmlPreview = false;
          this.generated = true;
        },
      });
  }

  private buildBars(s: { open: number; inProgress: number; closed: number; total: number; compliancePct: number }): void {
    const t = s.total || 1;
    this.statusBars = [
      { label: 'Abiertas',   value: s.open,       pct: Math.round(s.open       / t * 100), colorClass: 'open'  },
      { label: 'En proceso', value: s.inProgress,  pct: Math.round(s.inProgress / t * 100), colorClass: 'prog'  },
      { label: 'Cerradas',   value: s.closed,      pct: Math.round(s.closed     / t * 100), colorClass: 'close' },
    ];
    // riskBars y typeBars se podr�an calcular si el backend los devuelve;
    // por ahora los derivamos del resumen disponible.
    this.riskBars  = [];
    this.typeBars  = [];
  }

  // -- Descargas ------------------------------------------------------------

  downloadXlsx(): void {
    this.xlsxError = '';
    this.xlsxBusy  = true;
    this.api.downloadReportsXlsx(this.lastReportParams)
      .pipe(finalize(() => (this.xlsxBusy = false)))
      .subscribe({
        next: blob => this.triggerDownload(blob, 'inspecciones-reporte.xlsx'),
        error: () => (this.xlsxError = 'No se pudo descargar el Excel.'),
      });
  }

  /** Descarga el informe consolidado oficial (formato Proserla) */
  downloadConsolidated(): void {
    this.consolidatedBusy = true;
    const raw = this.form.getRawValue();
    this.api.downloadConsolidatedReport({
      site:        raw.areaCode ? undefined : undefined, // site viene del filtro de fundo
      reportMonth: raw.reportMonth?.trim().toUpperCase() || undefined,
      reportYear:  raw.reportYear?.trim() || undefined,
      areaCode:    raw.areaCode?.trim() || undefined,
      leaderCode:  raw.leaderCode?.trim() || undefined,
    })
      .pipe(finalize(() => (this.consolidatedBusy = false)))
      .subscribe({
        next: (blob) => {
          const month = raw.reportMonth?.trim() || '';
          const year  = raw.reportYear?.trim()  || '';
          const fname = `informe-inspeccion${month ? '-' + month : ''}${year ? '-' + year : ''}.xlsx`;
          this.triggerDownload(blob, fname);
        },
        error: () => (this.xlsxError = 'No se pudo generar el informe consolidado.'),
      });
  }

  downloadPdf(): void {
    this.pdfBusy = true;
    // PDF se abre en nueva pesta�a (el backend lo sirve directamente)
    window.open(this.pdfUrl, '_blank', 'noopener,noreferrer');
    this.pdfBusy = false;
  }

  downloadCsv(): void {
    this.csvBusy = true;
    window.open(this.csvUrl, '_blank', 'noopener,noreferrer');
    this.csvBusy = false;
  }

  openHtmlReport(): void {
    window.open(this.tableHtmlUrl, '_blank', 'noopener,noreferrer');
  }

  togglePreview(): void {
    this.showHtmlPreview = !this.showHtmlPreview;
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.rel      = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  }

  // -- Utilidades -----------------------------------------------------------

  barWidth(pct: number): number {
    return Math.max(pct > 0 ? 6 : 0, pct);
  }
}
