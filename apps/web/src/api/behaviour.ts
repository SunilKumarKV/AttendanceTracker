import { apiClient } from './client';

export type BehaviourRecordType = 'BEHAVIOUR' | 'DISCIPLINE' | 'APPRECIATION';
export type BehaviourTone = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
export type DisciplineSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface BehaviourRecordPayload {
  studentId: string;
  recordType: BehaviourRecordType;
  tone?: BehaviourTone;
  title: string;
  description: string;
  category?: string;
  severity?: DisciplineSeverity | '';
  actionTaken?: string;
  awardName?: string;
  achievement?: string;
  eventDate?: string;
  isApproved?: boolean;
  isAdminOnly?: boolean;
  parentNotificationRequired?: boolean;
}

export interface BehaviourRecord {
  id: string;
  studentId: string;
  studentName?: string;
  rollNumber?: string;
  className?: string;
  sectionName?: string;
  recordType: BehaviourRecordType;
  tone: BehaviourTone;
  title: string;
  description: string;
  category?: string | null;
  severity?: DisciplineSeverity | null;
  actionTaken?: string | null;
  awardName?: string | null;
  achievement?: string | null;
  eventDate: string;
  isApproved: boolean;
  isAdminOnly: boolean;
  parentNotificationRequired: boolean;
  parentNotifiedAt?: string | null;
  createdBy?: { name: string; role: string };
  approvedBy?: { name: string } | null;
  createdAt: string;
}

export const behaviourApi = {
  studentOptions: () => apiClient<{ success: true; data: Array<{ id: string; name: string; rollNumber?: string; course?: { name: string }; section?: { name: string } }> }>('/behaviour/student-options'),
  dashboard: () => apiClient<{ success: true; data: { recent: BehaviourRecord[]; highSeverityDisciplineCount: number; appreciationCount: number; pendingParentNotificationCount: number } }>('/behaviour/dashboard'),
  list: (params = '') => apiClient<{ success: true; data: BehaviourRecord[] }>(`/behaviour/records${params}`),
  create: (payload: BehaviourRecordPayload) => apiClient<{ success: true; data: BehaviourRecord }>('/behaviour/records', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: Partial<BehaviourRecordPayload>) => apiClient<{ success: true; data: BehaviourRecord }>(`/behaviour/records/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  approve: (id: string, approved: boolean) => apiClient<{ success: true; data: BehaviourRecord }>(`/behaviour/records/${id}/approval`, { method: 'PATCH', body: JSON.stringify({ approved }) }),
  remove: (id: string) => apiClient<{ success: true; data: { deleted: boolean } }>(`/behaviour/records/${id}`, { method: 'DELETE' }),
  report: (params = '') => apiClient<{ success: true; data: { records: BehaviourRecord[]; classSummary: Array<Record<string, unknown>>; monthlySummary: Array<Record<string, unknown>> } }>(`/behaviour/report${params}`),
};

export const behaviourExportUrl = (format: 'csv' | 'excel' | 'pdf') => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}/behaviour/export?format=${format}`;
};
