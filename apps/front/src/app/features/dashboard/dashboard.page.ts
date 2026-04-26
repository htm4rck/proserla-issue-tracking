import { DatePipe } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { Area } from '../../core/models/api.models';

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
    incidentType: [''],
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
  areas: Area[] = [];
  private areaNames = new Map<string, string>();

  ngOnInit(): void {
    this.api.listAreas().subscribe(({ data }) => {
      this.areas = data ?? [];
      this.areaNames = new Map(this.areas.map((area) => [area.code, area.name]));
    });
    const scope = this.session.scopedFilters();
    this.filterForm.patchValue({
      areaCode: scope.areaCode ?? '',
      leaderCode: scope.leaderCode ?? '',
    });
    if (this.session.user?.roleCode === 'leader') {
      this.filterForm.controls.areaCode.disable();
      this.filterForm.controls.leaderCode.disable();
    }
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    const q = this.filterForm.getRawValue();
    this.api
      .reportsAnalytics({
        areaCode: q.areaCode.trim() || undefined,
        leaderCode: q.leaderCode.trim() || undefined,
        status: q.status || undefined,
        riskLevel: q.riskLevel || undefined,
        incidentType: q.incidentType || undefined,
        reportMonth: q.reportMonth.trim() || undefined,
        reportYear: q.reportYear.trim() || undefined,
        period: q.period,
        referenceDate: q.referenceDate || undefined,
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
  }

  barPct(value: number, max: number): number {
    return max <= 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
  }

  areaLabel(code: string, name?: string): string {
    return name || this.areaNames.get(code) || code;
  }
}
