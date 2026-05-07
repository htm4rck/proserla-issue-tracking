import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { Area, Leader } from '../../core/models/api.models';
import { MONTH_OPTIONS, yearOptions } from '../../shared/temporal-options';

// -- Types --------------------------------------------------------------------

interface MonthlyAreaPoint {
  month: string;
  monthIndex: number;
  areaCode: string;
  areaName: string;
  open: number;
  inProgress: number;
  closed: number;
  total: number;
}

interface AnnualByAreaData {
  year: number;
  areas: string[];
  areaNames: Record<string, string>;
  months: MonthlyAreaPoint[];
}

/** Datos por mes para el gráfico anual (agrupados). */
interface MonthSummary {
  month: string;
  monthIndex: number;
  open: number;
  inProgress: number;
  closed: number;
  total: number;
  byArea: MonthlyAreaPoint[];
}

// -- Component ----------------------------------------------------------------

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard-kpis.scss', './dashboard.page.scss'],
})
export class DashboardPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);

  readonly filterForm = this.fb.nonNullable.group({
    areaCode: [''],
    leaderCode: [''],
    status: [''],
    riskLevel: [''],
    inspectionType: [''],
    reportMonth: [''],
    reportYear: [String(new Date().getFullYear())],
    period: ['monthly' as 'weekly' | 'biweekly' | 'monthly' | 'yearly'],
    referenceDate: [new Date().toISOString().slice(0, 10)],
  });

  loading = true;
  error = false;
  updatedAt: Date | null = null;

  summary: {
    open: number;
    inProgress: number;
    closed: number;
    total: number;
    compliancePct: number;
  } | null = null;

  rangeLabel = '';
  byStatus: Array<{ status: string; label: string; value: number }> = [];
  byArea: Array<{
    areaCode: string;
    areaName?: string;
    open: number;
    inProgress: number;
    closed: number;
    total: number;
  }> = [];
  maxStatusValue = 1;
  maxAreaTotal = 1;

  // -- Catálogos ----------------------------------------------------------
  areas: Area[] = [];
  leaders: Leader[] = [];
  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions = yearOptions(2020);
  private areaNames = new Map<string, string>();
  private readonly today = new Date().toISOString().slice(0, 10);

  // -- Gráfico anual ------------------------------------------------------
  annualLoading = false;
  annualData: AnnualByAreaData | null = null;
  annualMonths: MonthSummary[] = [];
  annualMaxTotal = 1;
  /** Área seleccionada para desglose en el gráfico anual (null = todas) */
  annualFocusArea: string | null = null;

  // -- Helpers ------------------------------------------------------------

  get leadersForArea(): Leader[] {
    const areaCode = this.filterForm.controls.areaCode.value?.trim();
    if (!areaCode) return this.leaders.filter((l) => l.isActive);
    return this.leaders.filter((l) => l.isActive && l.areaCode === areaCode);
  }

  ngOnInit(): void {
    // Cargar catálogos en paralelo
    this.api.listAreas().subscribe(({ data }) => {
      this.areas = data ?? [];
      this.areaNames = new Map(this.areas.map((a) => [a.code, a.name]));
    });
    this.api.listLeaders().subscribe(({ data }) => {
      this.leaders = data ?? [];
    });

    // Scope por rol
    const scope = this.session.scopedFilters();
    this.filterForm.patchValue({
      areaCode: scope.areaCode ?? '',
      leaderCode: scope.leaderCode ?? '',
    });
    if (this.session.user?.roleCode === 'leader') {
      this.filterForm.controls.areaCode.disable();
      this.filterForm.controls.leaderCode.disable();
    }

    // Auto-fill líder al cambiar área
    this.filterForm.controls.areaCode.valueChanges.subscribe((areaCode) => {
      if (this.session.user?.roleCode === 'leader') return;
      const current = this.filterForm.controls.leaderCode.value?.trim();
      // Si el líder actual no pertenece al área nueva, limpiar
      if (current) {
        const stillValid = this.leaders.some(
          (l) => l.isActive && l.areaCode === areaCode && l.code === current,
        );
        if (!stillValid) {
          this.filterForm.controls.leaderCode.setValue('', { emitEvent: false });
        }
      }
      // Si hay exactamente un líder en esa área, pre-seleccionarlo
      if (areaCode) {
        const inArea = this.leaders.filter((l) => l.isActive && l.areaCode === areaCode);
        if (inArea.length === 1) {
          this.filterForm.controls.leaderCode.setValue(inArea[0].code, { emitEvent: false });
        }
      }
    });

    // Cambio de período
    this.filterForm.controls.period.valueChanges.subscribe((period) =>
      this.applyEmbeddedTemporalFilters(period),
    );
    this.applyEmbeddedTemporalFilters(this.filterForm.controls.period.value);

    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    const q = this.filterForm.getRawValue();
    const temporal = this.normalizedTemporalFilters(q.period, q.reportYear, q.reportMonth, q.referenceDate);

    this.api
      .reportsAnalytics({
        areaCode: q.areaCode.trim() || undefined,
        leaderCode: q.leaderCode.trim() || undefined,
        status: q.status || undefined,
        riskLevel: q.riskLevel || undefined,
        inspectionType: q.inspectionType || undefined,
        reportMonth: temporal.reportMonth,
        reportYear: temporal.reportYear,
        period: q.period,
        referenceDate: temporal.referenceDate,
      })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ data }) => {
          this.summary = data.summary;
          this.rangeLabel = data.rangeLabel;
          this.byStatus = data.byStatus ?? [];
          this.byArea = data.byArea ?? [];
          this.maxStatusValue = Math.max(1, ...this.byStatus.map((s) => s.value));
          this.maxAreaTotal = Math.max(1, ...this.byArea.map((a) => a.total));
          this.updatedAt = new Date();
        },
        error: () => {
          this.error = true;
          this.summary = null;
          this.byStatus = [];
          this.byArea = [];
        },
      });

    // Cargar gráfico anual con el año del filtro
    const annualYear = Number(q.reportYear) || new Date().getFullYear();
    this.loadAnnual(annualYear, q.areaCode.trim() || undefined, q.leaderCode.trim() || undefined);
  }

  loadAnnual(year: number, areaCode?: string, leaderCode?: string): void {
    this.annualLoading = true;
    this.api
      .reportsAnnualByArea({ year, areaCode, leaderCode })
      .pipe(finalize(() => (this.annualLoading = false)))
      .subscribe({
        next: ({ data }) => {
          this.annualData = data;
          this.annualFocusArea = null;
          this.buildAnnualMonths(data);
        },
        error: () => {
          this.annualData = null;
          this.annualMonths = [];
        },
      });
  }

  private buildAnnualMonths(data: AnnualByAreaData): void {
    const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO',
                   'AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const monthMap = new Map<number, MonthSummary>();
    for (let i = 1; i <= 12; i++) {
      monthMap.set(i, {
        month: MESES[i - 1],
        monthIndex: i,
        open: 0, inProgress: 0, closed: 0, total: 0,
        byArea: [],
      });
    }
    for (const pt of data.months) {
      const ms = monthMap.get(pt.monthIndex)!;
      ms.open += pt.open;
      ms.inProgress += pt.inProgress;
      ms.closed += pt.closed;
      ms.total += pt.total;
      ms.byArea.push(pt);
    }
    this.annualMonths = [...monthMap.values()];
    this.annualMaxTotal = Math.max(1, ...this.annualMonths.map((m) => m.total));
  }

  setAnnualFocusArea(areaCode: string | null): void {
    this.annualFocusArea = areaCode;
  }

  annualMonthsForFocus(): MonthSummary[] {
    if (!this.annualFocusArea) return this.annualMonths;
    return this.annualMonths.map((ms) => {
      const pt = ms.byArea.find((p) => p.areaCode === this.annualFocusArea);
      return pt
        ? { ...ms, open: pt.open, inProgress: pt.inProgress, closed: pt.closed, total: pt.total }
        : { ...ms, open: 0, inProgress: 0, closed: 0, total: 0 };
    });
  }

  annualFocusMaxTotal(): number {
    return Math.max(1, ...this.annualMonthsForFocus().map((m) => m.total));
  }

  // -- Utilidades ---------------------------------------------------------

  barPct(value: number, max: number): number {
    return max <= 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
  }

  stackedPct(value: number, total: number): number {
    return total <= 0 ? 0 : Math.round((value / total) * 100);
  }

  areaLabel(code: string, name?: string): string {
    return name || this.areaNames.get(code) || code;
  }

  onPeriodChange(period: 'weekly' | 'biweekly' | 'monthly' | 'yearly'): void {
    this.applyEmbeddedTemporalFilters(period);
  }

  get isYearlyPeriod(): boolean {
    return this.filterForm.controls.period.value === 'yearly';
  }

  get isMonthlyPeriod(): boolean {
    return this.filterForm.controls.period.value === 'monthly';
  }

  get needsReferenceDate(): boolean {
    const p = this.filterForm.controls.period.value;
    return p === 'weekly' || p === 'biweekly';
  }

  get referenceDateLabel(): string {
    const p = this.filterForm.controls.period.value;
    if (p === 'weekly') return 'Inicio de semana';
    if (p === 'biweekly') return 'Inicio de quincena';
    return 'Fecha de referencia';
  }

  private applyEmbeddedTemporalFilters(
    period: 'weekly' | 'biweekly' | 'monthly' | 'yearly',
  ): void {
    if (period === 'yearly') {
      this.filterForm.patchValue(
        { reportYear: '', reportMonth: '', referenceDate: '' },
        { emitEvent: false },
      );
      return;
    }
    if (period === 'monthly') {
      const year =
        this.filterForm.controls.reportYear.value?.trim() || String(new Date().getFullYear());
      this.filterForm.patchValue({ reportYear: year, referenceDate: '' }, { emitEvent: false });
      return;
    }
    const ref = this.filterForm.controls.referenceDate.value || this.today;
    this.filterForm.patchValue(
      { reportYear: '', reportMonth: '', referenceDate: ref },
      { emitEvent: false },
    );
  }

  private normalizedTemporalFilters(
    period: 'weekly' | 'biweekly' | 'monthly' | 'yearly',
    reportYear: string,
    reportMonth: string,
    referenceDate: string,
  ): { reportYear?: string; reportMonth?: string; referenceDate?: string } {
    if (period === 'yearly') return {};

    if (period === 'monthly') {
      const MESES = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
                     'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
      const monthIndex = MESES.indexOf(reportMonth.trim().toUpperCase()); // 0-based
      const year = Number(reportYear.trim()) || new Date().getFullYear();

      // Derivar referenceDate desde mes+año para que el backend calcule el rango correcto
      let derivedReferenceDate: string | undefined;
      if (monthIndex >= 0) {
        // Primer día del mes seleccionado
        const d = new Date(year, monthIndex, 1);
        derivedReferenceDate = d.toISOString().slice(0, 10);
      }

      return {
        reportYear: reportYear.trim() || undefined,
        reportMonth: reportMonth.trim().toUpperCase() || undefined,
        referenceDate: derivedReferenceDate,
      };
    }

    // weekly / biweekly — usan referenceDate directamente
    return { referenceDate: referenceDate || undefined };
  }
}
