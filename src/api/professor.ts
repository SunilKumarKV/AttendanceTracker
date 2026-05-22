import { apiClient } from './client';
import { AttendanceStatus, Student } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface Paginated<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ProfessorAssignment {
  id: string;
  classId: string;
  courseId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  semesterId: string | null;
  semesterName: string | null;
  sectionId: string | null;
  sectionName: string | null;
}

export interface AttendanceRecordInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string | null;
}

export interface AttendanceSession {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  semesterId: string | null;
  semesterName: string | null;
  sectionId: string | null;
  sectionName: string | null;
  sessionDate: string;
  period: string;
  topic: string | null;
  notes: string | null;
  isLocked: boolean;
  lockedAt: string | null;
  records: Array<{
    id: string;
    studentId: string;
    studentName: string;
    rollNo: string;
    status: AttendanceStatus;
    remarks: string | null;
  }>;
}

export interface ProfessorDashboard {
  assignedCount: number;
  classCount: number;
  subjectCount: number;
  todaySessionCount: number;
  pendingAttendanceCount: number;
  assignments: ProfessorAssignment[];
  recentSessions: AttendanceSession[];
}

export const getProfessorDashboard = () => (
  apiClient<ApiResponse<ProfessorDashboard>>('/professor/dashboard')
);

export const getProfessorAssignments = () => (
  apiClient<ApiResponse<ProfessorAssignment[]>>('/professor/assignments')
);

export const getProfessorClassStudents = (classId: string, sectionId?: string | null) => {
  const params = new URLSearchParams();
  if (sectionId) params.set('sectionId', sectionId);
  return apiClient<ApiResponse<Student[]>>(`/professor/classes/${classId}/students${params.toString() ? `?${params}` : ''}`);
};

export const createAttendanceSession = (data: {
  courseId: string;
  subjectId: string;
  semesterId?: string | null;
  sectionId?: string | null;
  sessionDate: string;
  period: string;
  topic?: string | null;
  notes?: string | null;
  records: AttendanceRecordInput[];
}) => (
  apiClient<ApiResponse<AttendanceSession>>('/attendance/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
);

export interface AttendanceSessionFilters {
  page?: number;
  pageSize?: number;
  classId?: string;
  subjectId?: string;
  sectionId?: string;
  fromDate?: string;
  toDate?: string;
  locked?: boolean | string;
}

const queryString = (params: AttendanceSessionFilters = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const getAttendanceSessions = (filters: AttendanceSessionFilters = { pageSize: 20 }) => (
  apiClient<ApiResponse<Paginated<AttendanceSession>>>(`/attendance/sessions${queryString(filters)}`)
);

export const getAttendanceSession = (id: string) => (
  apiClient<ApiResponse<AttendanceSession>>(`/attendance/sessions/${id}`)
);

export const updateAttendanceSession = (id: string, data: {
  topic?: string | null;
  notes?: string | null;
  records?: AttendanceRecordInput[];
}) => (
  apiClient<ApiResponse<AttendanceSession>>(`/attendance/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export const lockAttendanceSession = (id: string) => (
  apiClient<ApiResponse<AttendanceSession>>(`/attendance/sessions/${id}/lock`, {
    method: 'POST',
  })
);

export interface CorrectionRequestPayload {
  sessionId: string;
  attendanceRecordId?: string | null;
  studentId?: string | null;
  requestedStatus?: AttendanceStatus | null;
  reason: string;
}

export interface LeaveRequestPayload {
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

export const createCorrectionRequest = (data: CorrectionRequestPayload) => (
  apiClient<ApiResponse<unknown>>('/attendance/correction-requests', { method: 'POST', body: JSON.stringify(data) })
);

export const getMyCorrectionRequests = () => apiClient<ApiResponse<unknown[]>>('/attendance/correction-requests');
export const createLeaveRequest = (data: LeaveRequestPayload) => (
  apiClient<ApiResponse<unknown>>('/attendance/leave-requests', { method: 'POST', body: JSON.stringify(data) })
);
export const getMyLeaveRequests = () => apiClient<ApiResponse<unknown[]>>('/attendance/leave-requests');
