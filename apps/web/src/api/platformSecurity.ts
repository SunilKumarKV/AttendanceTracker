import { apiClient } from './client';

export interface PlatformAuditActor {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface PlatformAuditInstitution {
  id: string;
  name: string;
  code: string;
}

export interface PlatformAuditLog {
  id: string;
  actorId?: string | null;
  institutionId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: PlatformAuditActor | null;
  institution?: PlatformAuditInstitution | null;
}

export interface PlatformAuditLogFilters {
  limit?: number;
  institutionId?: string;
  action?: string;
}

export const getPlatformAuditLogs = async (filters: PlatformAuditLogFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.institutionId) params.set('institutionId', filters.institutionId);
  if (filters.action) params.set('action', filters.action);

  const query = params.toString();
  return apiClient<{ success: boolean; data: PlatformAuditLog[] }>(`/platform/audit-logs${query ? `?${query}` : ''}`);
};
