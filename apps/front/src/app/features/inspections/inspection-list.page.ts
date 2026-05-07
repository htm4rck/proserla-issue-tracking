import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';
import { Area, Inspection, Leader } from '../../core/models/api.models';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { MONTH_OPTIONS, yearOptions } from '../../shared/temporal-options';
import {
  etiquetaEstadoInspeccion,
  etiquetaNivelRiesgo,
  etiquetaTipoInspeccion,
} from '../../shared/etiquetas';

export interface InspectionListImage {
  id: string;
  imageType: string;
  url: string;
  uploadedBy?: string;
  comment?: string;
  uploadOk?: boolean;
}

@Component({
  selector: 'app-inspection-list-page',
  imports: [RouterLink],
  templateUrl: './inspection-list.page.html',
  styleUrl: './inspection-list.page.scss',
})
export class InspectionListPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  readonly estado = etiquetaEstadoInspeccion;
  readonly riesgo = etiquetaNivelRiesgo;
  readonly tipoInspeccion = etiquetaTipoInspeccion;
  readonly summaryColCount = 7;
  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions = yearOptions(2020);

  inspections: Inspection[] = [];
  areas: Area[] = [];
  private areaNames = new Map<string, string>();
  private leaderNames = new Map<string, string>();

  private readonly expandedCodes = new Set<string>();
  private readonly imagesByCode = new Map<string, InspectionListImage[]>();
  private readonly loadingImagesFor = new Set<string>();

  status = '';
  riskLevel = '';
  inspectionType = '';
  period: 'weekly' | 'biweekly' | 'monthly' | 'yearly' = 'monthly';
  reportMonth = '';
  reportYear = new Date().getFullYear();
  referenceDate = new Date().toISOString().slice(0, 10);
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  ngOnInit(): void {
    forkJoin({
      areas: this.api.listAreas(),
      leaders: this.api.listLeaders(),
    }).subscribe(({ areas, leaders }) => {
      this.areas = areas.data ?? [];
      this.areaNames = new Map(this.areas.map((a) => [a.code, a.name]));
      const leadersData = leaders.data ?? [];
      this.leaderNames = new Map(
        leadersData.map((l: Leader) => [`${l.areaCode}|${l.code}`, l.fullName] as const),
      );
    });
    this.reload();
  }

  reload(): void {
    this.expandedCodes.clear();
    this.imagesByCode.clear();
    this.loadingImagesFor.clear();

    const temporal = this.normalizedTemporalFilters();
    const scope = this.session.scopedFilters();
    this.api
      .listInspectionsPaged({
        ...scope,
        status: this.status || undefined,
        riskLevel: this.riskLevel || undefined,
        inspectionType: this.inspectionType || undefined,
        reportMonth: temporal.reportMonth,
        reportYear: temporal.reportYear,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe(({ data }) => {
        this.inspections = data.items;
        this.page = data.page;
        this.pageSize = data.pageSize;
        this.total = data.total;
        this.totalPages = data.totalPages;
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.reload();
  }

  onPeriodChange(value: string): void {
    if (value !== 'weekly' && value !== 'biweekly' && value !== 'monthly' && value !== 'yearly') return;
    this.period = value;
    if (this.period === 'yearly') {
      this.reportYear = 0;
      this.reportMonth = '';
      this.referenceDate = '';
    } else if (this.period === 'monthly') {
      this.reportYear = this.reportYear || new Date().getFullYear();
      this.referenceDate = '';
    } else {
      this.reportYear = 0;
      this.reportMonth = '';
      this.referenceDate = this.referenceDate || new Date().toISOString().slice(0, 10);
    }
    this.applyFilters();
  }

  get isMonthlyPeriod(): boolean { return this.period === 'monthly'; }
  get isYearlyPeriod(): boolean { return this.period === 'yearly'; }
  get needsReferenceDate(): boolean { return this.period === 'weekly' || this.period === 'biweekly'; }
  get referenceDateLabel(): string { return this.period === 'biweekly' ? 'Inicio de quincena' : 'Inicio de semana'; }

  prevPage(): void { if (this.page <= 1) return; this.page -= 1; this.reload(); }
  nextPage(): void { if (this.page >= this.totalPages) return; this.page += 1; this.reload(); }

  setPageSize(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    this.pageSize = parsed;
    this.page = 1;
    this.reload();
  }

  toggleExpand(ev: Event, code: string): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (this.expandedCodes.has(code)) {
      this.expandedCodes.delete(code);
    } else {
      this.expandedCodes.add(code);
      this.ensureImagesLoaded(code);
    }
  }

  isExpanded(code: string): boolean { return this.expandedCodes.has(code); }
  expandGlyph(code: string): string { return this.isExpanded(code) ? '▲' : '▼'; }
  getImages(code: string): InspectionListImage[] { return this.imagesByCode.get(code) ?? []; }
  isImagesLoading(code: string): boolean { return this.loadingImagesFor.has(code); }

  private ensureImagesLoaded(code: string): void {
    if (this.imagesByCode.has(code) || this.loadingImagesFor.has(code)) return;
    this.loadingImagesFor.add(code);
    this.api.listByInspection('inspection-images', code).subscribe({
      next: ({ data }) => {
        this.imagesByCode.set(code, (data ?? []) as InspectionListImage[]);
        this.loadingImagesFor.delete(code);
      },
      error: () => {
        this.imagesByCode.set(code, []);
        this.loadingImagesFor.delete(code);
      },
    });
  }

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'open': return 'badge badge-open';
      case 'in_progress': return 'badge badge-progress';
      case 'closed': return 'badge badge-closed';
      default: return 'badge';
    }
  }

  evidenciaTipo(t: string): string {
    if (t === 'closure') return 'Cierre';
    if (t === 'report') return 'Informe';
    return t;
  }

  areaLabel(code: string): string { return this.areaNames.get(code) ?? '—'; }

  leaderLabel(areaCode: string, leaderCode?: string): string {
    const lc = leaderCode?.trim();
    if (!lc) return '—';
    return this.leaderNames.get(`${areaCode}|${lc}`) ?? '—';
  }

  reportWhen(i: Inspection): string {
    const y = i.reportYear;
    const m = i.reportMonth?.trim();
    const day = i.reportDay;
    const t = i.reportTime?.trim();
    const bits: string[] = [];
    if (y != null) bits.push(String(y));
    if (m) bits.push(m);
    if (day != null) bits.push(String(day));
    let s = bits.join(' ');
    if (t) s = s ? `${s} ${t}` : t;
    return s || '—';
  }

  formatDt(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('es');
  }

  dash(s: string | undefined | null): string { return (s ?? '').trim() || '—'; }

  truncate(s: string | undefined | null, max = 72): string {
    const t = (s ?? '').trim();
    if (!t) return '—';
    return t.length <= max ? t : `${t.slice(0, max)}…`;
  }

  private normalizedTemporalFilters(): { reportMonth?: string; reportYear?: number } {
    if (this.period === 'yearly') return {};
    if (this.period === 'monthly') {
      const month = this.reportMonth.trim().toUpperCase();
      const year = Number(this.reportYear);
      return {
        reportMonth: month || undefined,
        reportYear: Number.isFinite(year) && year > 0 ? year : undefined,
      };
    }
    if (!this.referenceDate) return {};
    const d = new Date(this.referenceDate);
    if (Number.isNaN(d.getTime())) return {};
    return { reportYear: d.getFullYear(), reportMonth: this.monthName(d.getMonth()) };
  }

  private monthName(monthIndex: number): string {
    return ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][monthIndex] ?? '';
  }
}
