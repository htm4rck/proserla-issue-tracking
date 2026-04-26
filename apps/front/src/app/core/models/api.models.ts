export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[];
}

export interface IncidentResponse {
  id: string;
  incidentCode: string;
  status: string;
  imageType: string;
  url: string;
  storagePath?: string;
  uploadedBy?: string;
  comment?: string;
  uploadOk: boolean;
  uploadError?: string;
  createdAt: string;
}

export interface Incident {
  id: string;
  incidentCode: string;
  reportedBy: string;
  /** UUID del usuario que registró (servidor). */
  reportedByUserId?: string;
  reportYear?: number;
  reportMonth?: string;
  reportDay?: number;
  reportTime?: string;
  site?: string;
  reportedPerson?: string;
  reportedPersonAge?: string;
  employerType?: string;
  areaCode: string;
  areaName?: string;
  leaderCode?: string;
  assignedTo?: string;
  location: string;
  workArea?: string;
  incidentType: 'act' | 'condition';
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  comment?: string;
  reportSource?: string;
  correctiveMeasures?: string;
  status: 'open' | 'in_progress' | 'closed';
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedIncidents {
  items: Incident[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  roleCode: string;
  areaCode: string;
  areaName?: string;
  leaderCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Area {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Leader {
  id: string;
  code: string;
  fullName: string;
  email?: string;
  areaCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSite {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  roleCode: string;
  areaCode: string;
  leaderCode?: string;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changeLabel?: string;
  previousValue?: string;
  nextValue?: string;
  changedBy?: string;
  createdAt: string;
}

export interface AuditLogDetail extends AuditLogItem {
  previousSnapshot?: Record<string, unknown>;
  diff?: Record<string, { from: unknown; to: unknown }>;
}

export interface AuditLogPage {
  items: AuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
