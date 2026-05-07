import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Area,
  AuditLogDetail,
  AuditLogPage,
  Inspection,
  Leader,
  PaginatedInspections,
  SessionUser,
  User,
  WorkSite,
} from '../models/api.models';
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

  listInspections(params?: {
    status?: string;
    areaCode?: string;
    leaderCode?: string;
    riskLevel?: string;
    inspectionType?: string;
    reportMonth?: string;
    reportYear?: number;
  }): Observable<ApiResponse<Inspection[]>> {
    return this.http.get<ApiResponse<Inspection[]>>(`${this.base}/inspections`, { params: this.cleanParams(params) });
  }

  listInspectionsPaged(params?: {
    status?: string;
    areaCode?: string;
    leaderCode?: string;
    riskLevel?: string;
    inspectionType?: string;
    reportMonth?: string;
    reportYear?: number;
    page?: number;
    pageSize?: number;
  }): Observable<ApiResponse<PaginatedInspections>> {
    return this.http.get<ApiResponse<PaginatedInspections>>(`${this.base}/inspections/paged`, {
      params: this.cleanParams(params),
    });
  }

  getInspection(inspectionCode: string): Observable<ApiResponse<Inspection | null>> {
    return this.http.get<ApiResponse<Inspection | null>>(`${this.base}/inspections/${inspectionCode}`);
  }

  createInspection(payload: Partial<Inspection> & Record<string, unknown>): Observable<ApiResponse<Inspection>> {
    return this.http.post<ApiResponse<Inspection>>(`${this.base}/inspections`, payload);
  }

  updateInspection(inspectionCode: string, payload: Record<string, unknown>): Observable<ApiResponse<Inspection>> {
    return this.http.patch<ApiResponse<Inspection>>(`${this.base}/inspections/${encodeURIComponent(inspectionCode)}`, payload);
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

  // -- Gesti�n multi-�rea: usuarios --------------------------------------------

  addUserArea(userId: string, payload: { areaCode: string; leaderCode?: string; isPrimary?: boolean }): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(`${this.base}/users/${encodeURIComponent(userId)}/areas`, payload);
  }

  removeUserArea(userId: string, payload: { areaCode: string }): Observable<ApiResponse<any[]>> {
    return this.http.delete<ApiResponse<any[]>>(`${this.base}/users/${encodeURIComponent(userId)}/areas`, { body: payload });
  }

  setUserPrimaryArea(userId: string, areaCode: string): Observable<ApiResponse<any[]>> {
    return this.http.patch<ApiResponse<any[]>>(
      `${this.base}/users/${encodeURIComponent(userId)}/areas/${encodeURIComponent(areaCode)}/primary`,
      {},
    );
  }

  // -- Gesti�n multi-�rea: l�deres ---------------------------------------------

  addLeaderArea(leaderCode: string, payload: { areaCode: string; isPrimary?: boolean }): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>(`${this.base}/leaders/${encodeURIComponent(leaderCode)}/areas`, payload);
  }

  removeLeaderArea(leaderCode: string, payload: { areaCode: string }): Observable<ApiResponse<any[]>> {
    return this.http.delete<ApiResponse<any[]>>(`${this.base}/leaders/${encodeURIComponent(leaderCode)}/areas`, { body: payload });
  }

  listAreas(): Observable<ApiResponse<Area[]>> {
    return this.http.get<ApiResponse<Area[]>>(`${this.base}/areas`);
  }

  listLeaders(): Observable<ApiResponse<Leader[]>> {
    return this.http.get<ApiResponse<Leader[]>>(`${this.base}/leaders`);
  }

  listWorkSites(): Observable<ApiResponse<WorkSite[]>> {
    return this.http.get<ApiResponse<WorkSite[]>>(`${this.base}/work-sites`);
  }

  listWorkSitesAdmin(): Observable<ApiResponse<WorkSite[]>> {
    return this.http.get<ApiResponse<WorkSite[]>>(`${this.base}/work-sites/admin/all`);
  }

  createWorkSite(payload: Partial<WorkSite>): Observable<ApiResponse<WorkSite>> {
    return this.http.post<ApiResponse<WorkSite>>(`${this.base}/work-sites`, payload);
  }

  listSimple(path: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/${path}`);
  }

  listCatalogByType(catalogType: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/catalog-items`, {
      params: { catalogType },
    });
  }

  createSimple(path: string, payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${path}`, payload);
  }

  listByInspection(path: string, inspectionCode: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.base}/${path}/${inspectionCode}`);
  }

  createByInspection(path: string, payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.base}/${path}`, payload);
  }

  reportsSummary(params?: {
    areaCode?: string;
    leaderCode?: string;
    status?: string;
    riskLevel?: string;
    inspectionType?: string;
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
    inspectionType?: string;
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
    inspectionType?: string;
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

  reportsAnnualByArea(params: {
    year: number;
    areaCode?: string;
    leaderCode?: string;
  }): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.base}/reports/annual-by-area`, {
      params: this.cleanParams(params as Record<string, unknown>),
    });
  }

  // -- Audit log ----------------------------------------------------------

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

  // -- Upload PHP bridge --------------------------------------------------

  uploadInspectionFile(
    file: File,
    inspectionCode: string,
    imageType: 'report' | 'closure',
    options?: { uploadedBy?: string; comment?: string; status?: string },
  ): Observable<ApiResponse<any>> {
    const form = new FormData();
    form.append('file', file);
    form.append('inspectionCode', inspectionCode);
    form.append('imageType', imageType);
    if (options?.uploadedBy) form.append('uploadedBy', options.uploadedBy);
    if (options?.comment) form.append('comment', options.comment);
    if (options?.status) form.append('status', options.status);
    return this.http.post<ApiResponse<any>>(`${this.base}/Inspection-images/upload`, form);
  }
}
