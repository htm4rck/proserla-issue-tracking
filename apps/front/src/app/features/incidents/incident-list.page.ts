import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiClientService } from '../../core/services/api-client.service';
import { Area, Incident } from '../../core/models/api.models';
import { AuthSessionService } from '../../core/services/auth-session.service';
import {
  etiquetaEstadoIncidencia,
  etiquetaNivelRiesgo,
} from '../../shared/etiquetas';

@Component({
  selector: 'app-incident-list-page',
  imports: [RouterLink],
  templateUrl: './incident-list.page.html',
  styleUrl: './incident-list.page.scss',
})
export class IncidentListPageComponent implements OnInit {
  private readonly api = inject(ApiClientService);
  private readonly session = inject(AuthSessionService);
  readonly estado = etiquetaEstadoIncidencia;
  readonly riesgo = etiquetaNivelRiesgo;
  incidents: Incident[] = [];
  areas: Area[] = [];
  private areaNames = new Map<string, string>();
  status = '';
  riskLevel = '';
  incidentType = '';
  reportMonth = '';
  reportYear = new Date().getFullYear();
  page = 1;
  pageSize = 10;
  total = 0;
  totalPages = 1;

  ngOnInit(): void {
    this.api.listAreas().subscribe(({ data }) => {
      this.areas = data ?? [];
      this.areaNames = new Map(this.areas.map((area) => [area.code, area.name]));
    });
    this.reload();
  }

  reload(): void {
    const scope = this.session.scopedFilters();
    this.api
      .listIncidentsPaged({
        ...scope,
        status: this.status || undefined,
        riskLevel: this.riskLevel || undefined,
        incidentType: this.incidentType || undefined,
        reportMonth: this.reportMonth.trim() || undefined,
        reportYear: this.reportYear || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe(({ data }) => {
        this.incidents = data.items;
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

  prevPage(): void {
    if (this.page <= 1) return;
    this.page -= 1;
    this.reload();
  }

  nextPage(): void {
    if (this.page >= this.totalPages) return;
    this.page += 1;
    this.reload();
  }

  setPageSize(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    this.pageSize = parsed;
    this.page = 1;
    this.reload();
  }

  areaLabel(code: string): string {
    return this.areaNames.get(code) ?? code;
  }
}
