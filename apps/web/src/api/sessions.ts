import { apiClient } from './client';

export interface ActiveSession {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceLabel?: string | null;
  lastUsedAt?: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export const getActiveSessions = async () => (
  apiClient<{ success: boolean; data: ActiveSession[] }>('/auth/sessions')
);

export const revokeSession = async (sessionId: string) => (
  apiClient<{ success: boolean }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' })
);

export const revokeOtherSessions = async () => (
  apiClient<{ success: boolean }>('/auth/sessions', { method: 'DELETE' })
);
