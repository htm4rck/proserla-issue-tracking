import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Area, AuditLogDetail, AuditLogPage, Incident, PaginatedIncidents, SessionUser, User } from '../models/api.models';
import { SeedRunPayload } from '../models/seed.models';

@Injectable({ providedIn: 'root' })
export class ApiClientService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private cleanParams<T extends Record<string, unknown>>(params?: T): Record<string, string | number | boolean> {
    return Object.fromEntries(
      Object.entries(params ?? {}).filter(([, value]) => {
        if (value === undefined || value === null) return false;
        if (typeof value !== 'string') return true;
        const trimmed = value.trim().toLowerCase();
        return trimmed !== '' && trimmed !== 'undefined' && trimmed !== 'null';
      }),
    ) as Record<string, string | number | boolean>;
  }

  getHealth(): Observable<ApiResponse<{ service: string }>> {
    return this.http.get<ApiResponse<{ service: string }>>(`${this.base}/health`);
  }

  login(payload: { email: string; password: string }): Observable<ApiResponse<SessionUser>> {
    return this.http.post<ApiResponse<SessionUser>>(`${this.base}/auth/login`, payload);
  }

  changePassword(payload: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<ApiResponse<{ userId: string; updatedAt: string }>> {
    return this.http.post<ApiResponse<{ userId: string; updatedAt: string }>>(
      `${this.base}/auth/change-password`,
      payload,
    );
  }

  listIncidents(params?: {
    status?: string;
    areaCode?: string;
    leaderCode?: string;
    riskLevel?: string;
    incidentType?: string;
    reportMonth?: string;
    reportYear?: number;
  }): Observable<ApiResponse<Incident[]>> {
    return this.http.get<ApiResponse<Incident[]>>(`${this.base}/incidents`, { params: this.cleanParams(params) });
  }

  listIncidentsPaged(params?: {
    status?: string;
    areaCode?: string;
    leaderCode?: string;
    riskLevel?: string;
    incidentType?: string;
    reportMonth?: string;
    reportYear?: number;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<PaginatedIncidents>> {
    return this.http.get<ApiResponse<PaginatedIncidents>>(`${this.base}/incidents/paged`, {
      params: this.cleanParams(params),
    });
  }

  getIncident(incidentCode: string): Observable<ApiResponse<Incident | null>> {
    return this.http.get<ApiResponse<Incident | null>>(`${this.base}/incidents/${incidentCode}`);
  }

  createIncident(payload: Partial<Incident> & Record<string, unknown>): Observable<ApiResponse<Incident>> {
    return this.http.post<ApiResponse<Incident>>(`${this.base}/incidents`, payload);
  }

  updateIncident(incidentCode: string, payload: Record<string, unknown>): Observable<ApiResponse<Incident>> {
    return this.http.patch<ApiResponse<Incident>>(`${this.base}/incidents/${encodeURIComponent(incidentCode)}`, payload);
  }

  listUsers(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.base}/users`);
  }

  createUser(payload: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.base}/users`, payload);
  }

  resetUserPassword(userId: string, newPassword: string): Observable<ApiResponse<{ userId: string; email: string; updatedAt: string }>> {
    return this.http.patch<ApiResponse<{ userId: string; email: string; updatedAt: string }>>(
      `${this.base}/users/${encodeURIComponent(userId)}/reset-password`,
      { newPassword },
    );
  }

  listAreas(): Observable<ApiResponse<Area[]>> {
    return this.http.get<ApiResponse<Area[]>>(`${this.base}/areas`);
  }

  listSimple(path: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/${path}`);
  }

  createSimple(path: string, payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${path}`, payload);
  }

  listByIncident(path: string, incidentCode: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/${path}/${incidentCode}`);
  }

  createByIncident(path: string, payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${path}`, payload);
  }

  reportsSummary(params?: {
    areaCode?: string;
    leaderCode?: string;
    status?: string;
    riskLevel?: string;
    incidentType?: string;
    reportMonth?: string;
    reportYear?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/reports/summary`, { params: this.cleanParams(params) });
  }

  reportsAnalytics(params?: {
    areaCode?: string;
    leaderCode?: string;
    status?: string;
    riskLevel?: string;
    incidentType?: string;
    reportMonth?: string;
    reportYear?: string;
    period?: 'weekly' | 'biweekly' | 'monthly' | 'yearly';
    referenceDate?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/reports/analytics`, { params: this.cleanParams(params) });
  }

  runSeed(): Observable<ApiResponse<SeedRunPayload>> {
    return this.http.post<ApiResponse<SeedRunPayload>>(`${this.base}/dev/seed`, {});
  }

  reportsCsvUrl(params?: Record<string, string | undefined>): string {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const qs = search.toString();
    return `${this.base}/reports/export.csv${qs ? `?${qs}` : ''}`;
  }

  /** Descarga .xlsx real (OpenXML); usar con `responseType: 'blob'` desde el componente. */
  downloadReportsXlsx(params?: {
    areaCode?: string;
    leaderCode?: string;
    status?: string;
    riskLevel?: string;
    incidentType?: string;
    reportMonth?: string;
    reportYear?: string;
  }): Observable<Blob> {
    return this.http.get(`${this.base}/reports/export.xlsx`, {
      params: this.cleanParams(params),
      responseType: 'blob',
    });
  }

  /** @deprecated HTML como .xls; preferir downloadReportsXlsx. */
  reportsExcelUrl(params?: Record<string, string | undefined>): string {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const qs = search.toString();
    return `${this.base}/reports/export.xls${qs ? `?${qs}` : ''}`;
  }

  reportsPdfUrl(params?: Record<string, string | undefined>): string {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const qs = search.toString();
    return `${this.base}/reports/export.pdf${qs ? `?${qs}` : ''}`;
  }

  reportsTableHtmlUrl(params?: Record<string, string | undefined>): string {
    const search = new URLSearchParams();
    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value) search.set(key, value);
    });
    const qs = search.toString();
    return `${this.base}/reports/tabla.html${qs ? `?${qs}` : ''}`;
  }

  // ── Audit log ──────────────────────────────────────────────────────────

  listAuditLogs(params?: {
    entityType?: string;
    entityId?: string;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<AuditLogPage>> {
    return this.http.get<ApiResponse<AuditLogPage>>(`${this.base}/audit-logs`, {
      params: this.cleanParams(params ?? {}),
    });
  }

  getAuditLog(id: string): Observable<ApiResponse<AuditLogDetail | null>> {
    return this.http.get<ApiResponse<AuditLogDetail | null>>(`${this.base}/audit-logs/${id}`);
  }

  // ── Upload PHP bridge ──────────────────────────────────────────────────

  uploadIncidentFile(
    file: File,
    incidentCode: string,
    imageType: 'report' | 'closure',
    options?: { uploadedBy?: string; comment?: string; status?: string },
  ): Observable<ApiResponse<any>> {
    const form = new FormData();
    form.append('file', file);
    form.append('incidentCode', incidentCode);
    form.append('imageType', imageType);
    if (options?.uploadedBy) form.append('uploadedBy', options.uploadedBy);
    if (options?.comment) form.append('comment', options.comment);
    if (options?.status) form.append('status', options.status);
    return this.http.post<ApiResponse<any>>(`${this.base}/incident-images/upload`, form);
  }
}
