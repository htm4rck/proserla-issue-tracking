import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Incident } from '../../core/models/api.models';
import { ApiClientService } from '../../core/services/api-client.service';
import { AuthSessionService } from '../../core/services/auth-session.service';
import { etiquetaEstadoIncidencia, etiquetaNivelRiesgo } from '../../shared/etiquetas';
import { MONTH_OPTIONS, yearOptions } from '../../shared/temporal-options';

@Component({
  selector: 'app-control-panel-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './control-panel.page.html',
  styleUrl: './control-panel.page.scss',
})
export class ControlPanelPageComponent {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  private readonly fb = inject(FormBuilder);

  readonly estado = etiquetaEstadoIncidencia;
  readonly riesgo = etiquetaNivelRiesgo;
  readonly currentUser = this.session.user;
  readonly monthOptions = MONTH_OPTIONS;
  readonly yearOptions = yearOptions(2020);
  readonly form = this.fb.nonNullable.group({
    status: [''],
    areaCode: [this.session.scopedFilters().areaCode ?? ''],
    leaderCode: [this.session.scopedFilters().leaderCode ?? ''],
    riskLevel: [''],
    incidentType: [''],
    reportMonth: [''],
    reportYear: [String(new Date().getFullYear())],
  });

  rows: Incident[] = [];
  loading = false;
  summary = { open: 0, inProgress: 0, closed: 0, total: 0, compliancePct: 0 };

  run(): void {
    this.loading = true;
    const v = this.form.getRawValue();
    this.api
      .listIncidents({
        status: v.status || undefined,
        areaCode: v.areaCode || undefined,
        leaderCode: v.leaderCode || undefined,
        riskLevel: v.riskLevel || undefined,
        incidentType: v.incidentType || undefined,
        reportMonth: v.reportMonth || undefined,
        reportYear: v.reportYear ? Number(v.reportYear) : undefined,
      })
      .subscribe({
        next: ({ data }) => {
          this.rows = data;
          this.summary = this.buildSummary(data);
          this.loading = false;
        },
        error: () => {
          this.rows = [];
          this.summary = this.buildSummary([]);
          this.loading = false;
        },
      });
  }

  private buildSummary(rows: Incident[]): typeof this.summary {
    const open = rows.filter((x) => x.status === 'open').length;
    const inProgress = rows.filter((x) => x.status === 'in_progress').length;
    const closed = rows.filter((x) => x.status === 'closed').length;
    const total = rows.length;
    return {
      open,
      inProgress,
      closed,
      total,
      compliancePct: total ? Number(((closed / total) * 100).toFixed(2)) : 0,
    };
  }

  statusClass(status: string): string {
    if (status === 'open') return 'status-pill status-open';
    if (status === 'in_progress') return 'status-pill status-progress';
    if (status === 'closed') return 'status-pill status-closed';
    return 'status-pill';
  }
}
