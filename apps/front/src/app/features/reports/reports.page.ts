import { Component, inject, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { Area } from '../../core/models/api.models';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { MONTH_OPTIONS, yearOptions } from '../../shared/temporal-options';

@Component({
  selector: 'app-reports-page',
  imports: [ReactiveFormsModule],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
})
export class ReportsPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);

  readonly form = this.fb.nonNullable.group({
    areaCode: [this.session.scopedFilters().areaCode ?? ''],
    leaderCode: [this.session.scopedFilters().leaderCode ?? ''],
    status: [''],
    riskLevel: [''],
    incidentType: [''],
    reportMonth: [''],
    reportYear: [String(new Date().getFullYear())],
  });

  summary: {
    open: number;
    inProgress: number;
    closed: number;
    total: number;
    compliancePct: number;
  } | null = null;
  csvUrl = '';
  pdfUrl = '';
  tableHtmlUrl = '';
  previewHtmlUrl: SafeResourceUrl | null = null;
  showHtmlPreview = false;
  xlsxBusy = false;
  xlsxError = '';
  private lastReportParams: Record<string, string | undefined> = {};
  areas: Area[] = [];
  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions = yearOptions(2020);

  ngOnInit(): void {
    this.api.listAreas().subscribe(({ data }) => (this.areas = data ?? []));
    if (this.session.user?.roleCode === 'leader') {
      this.form.controls.areaCode.disable();
      this.form.controls.leaderCode.disable();
    }
  }

  run(): void {
    const raw = this.form.getRawValue();
    const q = Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [key, String(value).trim() || undefined]),
    ) as Record<string, string | undefined>;
    this.lastReportParams = q;
    this.xlsxError = '';
    this.api.reportsSummary(q).subscribe(({ data }) => (this.summary = data));
    this.csvUrl = this.api.reportsCsvUrl(q);
    this.pdfUrl = this.api.reportsPdfUrl(q);
    this.tableHtmlUrl = this.api.reportsTableHtmlUrl(q);
    this.previewHtmlUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.tableHtmlUrl);
    this.showHtmlPreview = true;
  }

  downloadXlsx(): void {
    if (!this.tableHtmlUrl) return;
    this.xlsxError = '';
    this.xlsxBusy = true;
    this.api
      .downloadReportsXlsx(this.lastReportParams)
      .pipe(finalize(() => (this.xlsxBusy = false)))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'incidencias-reporte.xlsx';
          a.rel = 'noopener';
          a.click();
          URL.revokeObjectURL(url);
        },
        error: () => (this.xlsxError = 'No se pudo descargar el Excel. Comprueba la conexión o vuelve a generar el reporte.'),
      });
  }

  togglePreview(): void {
    this.showHtmlPreview = !this.showHtmlPreview;
  }
}
