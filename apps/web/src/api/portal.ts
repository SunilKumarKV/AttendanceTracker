import { apiClient } from './client';

export interface PortalApiResponse<T> { success: boolean; data: T }

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  approvedLeave: number;
  total: number;
  percentage: number;
  lowAttendanceWarning: 'NONE' | 'LOW' | 'VERY_LOW' | 'CRITICAL';
}

export interface PortalProfile {
  id: string;
  name: string;
  rollNumber: string;
  email?: string | null;
  phone?: string | null;
  parentName?: string | null;
  parentEmail?: string | null;
  parentPhone?: string | null;
  academicYear?: string | null;
  course?: { id: string; name: string; code?: string | null } | null;
  section?: { id: string; name: string; code?: string | null } | null;
}

export interface PortalDashboard {
  profile: PortalProfile;
  summary: AttendanceSummary;
  subjects: Array<{ subjectId: string; subjectName: string } & AttendanceSummary>;
  months: Array<{ month: string } & AttendanceSummary>;
  recentAttendance: Array<{ id: string; date: string; subject?: string; course?: string; section?: string; period?: string; status: string; remarks?: string | null }>;
  leaves: Array<{ id: string; fromDate: string; toDate: string; reason: string; status: string; adminNote?: string | null }>;
  corrections: Array<{ id: string; reason: string; status: string; adminNote?: string | null; createdAt: string; session?: { subject?: { name: string } } }>;
  notifications: PortalNotification[];
}

export interface PortalNotification {
  id: string;
  type?: string | null;
  subject?: string | null;
  message: string;
  status: string;
  createdAt: string;
}

export const getStudentDashboard = () => apiClient<PortalApiResponse<PortalDashboard>>('/student-portal/dashboard');
export const getStudentProfile = () => apiClient<PortalApiResponse<PortalProfile>>('/student-portal/profile');
export const getStudentReport = () => apiClient<PortalApiResponse<PortalDashboard & { rows: unknown[] }>>('/student-portal/report');
export const getStudentNotifications = () => apiClient<PortalApiResponse<PortalNotification[]>>('/student-portal/notifications');

export const getParentChildren = () => apiClient<PortalApiResponse<PortalProfile[]>>('/parent-portal/children');
export const getParentChildDashboard = (studentId: string) => apiClient<PortalApiResponse<PortalDashboard>>(`/parent-portal/children/${studentId}/dashboard`);
export const getParentChildReport = (studentId: string) => apiClient<PortalApiResponse<PortalDashboard & { rows: unknown[] }>>(`/parent-portal/children/${studentId}/report`);
export const getParentNotifications = () => apiClient<PortalApiResponse<PortalNotification[]>>('/parent-portal/notifications');

export const createStudentPortalAccess = (payload: { studentId: string; email?: string; password: string }) => apiClient<PortalApiResponse<unknown>>('/admin/portal/student-access', { method: 'POST', body: JSON.stringify(payload) });
export const createParentPortalAccess = (payload: { name: string; email: string; phone?: string; password: string; studentIds: string[] }) => apiClient<PortalApiResponse<unknown>>('/admin/portal/parent-access', { method: 'POST', body: JSON.stringify(payload) });
