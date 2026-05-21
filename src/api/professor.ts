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
  topic?: string | null;
  notes?: string | null;
  records: AttendanceRecordInput[];
}) => (
  apiClient<ApiResponse<AttendanceSession>>('/attendance/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  })
);

export const getAttendanceSessions = () => (
  apiClient<ApiResponse<Paginated<AttendanceSession>>>('/attendance/sessions?pageSize=20')
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
