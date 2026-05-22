import { apiClient } from './client';
import { Student, User } from '../types';

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

export type AcademicResource = 'classes' | 'subjects' | 'semesters' | 'sections' | 'assignments';

export interface Course {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  _count?: { semesters?: number; sections?: number; subjects?: number; students?: number; professorAssignments?: number };
}

export interface Semester {
  id: string;
  courseId: string;
  name: string;
  number: number;
  isActive?: boolean;
  course?: Course;
}

export interface Section {
  id: string;
  courseId: string;
  semesterId?: string | null;
  name: string;
  code?: string | null;
  capacity?: number | null;
  isActive?: boolean;
  course?: Course;
  semester?: Semester | null;
}

export interface Subject {
  id: string;
  courseId: string;
  semesterId?: string | null;
  name: string;
  code: string;
  credits?: number | null;
  isActive?: boolean;
  course?: Course;
  semester?: Semester | null;
}

export interface ProfessorAssignment {
  id: string;
  professorId: string;
  courseId: string;
  subjectId: string;
  semesterId?: string | null;
  sectionId?: string | null;
  isActive: boolean;
  professor?: Pick<Professor, 'id' | 'name' | 'email'>;
  course?: Course;
  subject?: Subject;
  semester?: Semester | null;
  section?: Section | null;
}

export interface Professor extends User {
  id: string;
  employeeId: string;
  status: 'Active' | 'Inactive';
  assignedCount?: number;
}

export interface DashboardData {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  below75Count: number;
  chartData: { name: string; percentage: number }[];
  atRiskStudents: { name: string; rollNo: string; phone: string; attendancePercentage: number }[];
  recentActivity: { date: string; subject: string; professor: string; present: number; absent: number }[];
  pendingCorrections?: number;
  pendingLeaveRequests?: number;
  todayStatus?: { workingDay: boolean; holiday?: Holiday | null };
  setupChecklist?: {
    institutionProfileCompleted: boolean;
    classes: number;
    semesters: number;
    sections: number;
    subjects: number;
    professors: number;
    students: number;
    assignments: number;
  };
}

const queryString = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export const getAdminDashboard = () => (
  apiClient<ApiResponse<DashboardData>>('/admin/dashboard')
);

export const getProfessors = (search?: string, page = 1, pageSize = 10) => (
  apiClient<ApiResponse<Paginated<Professor>>>(`/professors${queryString({ search, page, pageSize })}`)
);

export const createProfessor = (data: Partial<Professor>) => (
  apiClient<ApiResponse<Professor>>('/professors', {
    method: 'POST',
    body: JSON.stringify(data),
  })
);

export const updateProfessor = (id: string, data: Partial<Professor>) => (
  apiClient<ApiResponse<Professor>>(`/professors/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export const deleteProfessor = (id: string) => (
  apiClient<void>(`/professors/${id}`, { method: 'DELETE' })
);

export type Teacher = Professor;
export type TeacherAssignment = ProfessorAssignment;
export const getTeachers = getProfessors;
export const createTeacher = createProfessor;
export const updateTeacher = updateProfessor;
export const deleteTeacher = deleteProfessor;

export const getStudents = (search?: string, page = 1, pageSize = 10) => (
  apiClient<ApiResponse<Paginated<Student>>>(`/students${queryString({ search, page, pageSize })}`)
);

export const createStudent = (data: Student) => (
  apiClient<ApiResponse<Student>>('/students', {
    method: 'POST',
    body: JSON.stringify(data),
  })
);


export interface StudentImportResult {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  errors: Array<{ row: number; errors: string[] }>;
}

export const importStudentsFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient<ApiResponse<StudentImportResult>>('/students/import', {
    method: 'POST',
    body: formData,
  });
};

export const updateStudent = (id: string, data: Partial<Student>) => (
  apiClient<ApiResponse<Student>>(`/students/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export const deleteStudent = (id: string) => (
  apiClient<void>(`/students/${id}`, { method: 'DELETE' })
);

export const getAcademicResource = <T>(resource: AcademicResource, params: Record<string, string | number | undefined> = {}) => (
  apiClient<ApiResponse<Paginated<T>>>(`/${resource}${queryString(params)}`)
);

export const createAcademicResource = <T>(resource: AcademicResource, data: Record<string, unknown>) => (
  apiClient<ApiResponse<T>>(`/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
);

export const updateAcademicResource = <T>(resource: AcademicResource, id: string, data: Record<string, unknown>) => (
  apiClient<ApiResponse<T>>(`/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export const deleteAcademicResource = (resource: AcademicResource, id: string) => (
  apiClient<void>(`/${resource}/${id}`, { method: 'DELETE' })
);

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  actor?: { id: string; name: string; email: string; role: string } | null;
  metadata?: unknown;
}

export interface LoginHistoryEntry {
  id: string;
  email: string;
  success: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; role: string } | null;
}

export const getAuditLogs = (limit = 50) => (
  apiClient<ApiResponse<AuditLogEntry[]>>(`/admin/audit-logs${queryString({ limit })}`)
);

export const getActivityTimeline = (limit = 20) => (
  apiClient<ApiResponse<AuditLogEntry[]>>(`/admin/activity-timeline${queryString({ limit })}`)
);

export const getLoginHistory = (limit = 50) => (
  apiClient<ApiResponse<LoginHistoryEntry[]>>(`/admin/login-history${queryString({ limit })}`)
);

export interface AttendancePolicy {
  id: string;
  lockAfterHours: number;
  workingDays: number[];
  adminOverrideEnabled: boolean;
}

export interface Holiday {
  id: string;
  academicYear: string;
  date: string;
  name: string;
  description?: string | null;
}

export interface AttendanceReviewRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string;
  adminNote?: string | null;
  createdAt: string;
  requestedStatus?: string | null;
  currentStatus?: string | null;
  student?: { id: string; name: string; rollNumber: string } | null;
  requestedBy?: { name: string; email: string; role: string } | null;
  session?: { id: string; sessionDate: string; period: string; course?: Course; subject?: Subject; section?: Section | null } | null;
}

export interface LeaveRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  fromDate: string;
  toDate: string;
  reason: string;
  adminNote?: string | null;
  createdAt: string;
  student?: Student & { course?: Course; section?: Section };
  requestedBy?: { name: string; email: string; role: string } | null;
}

export const getAttendancePolicy = () => apiClient<ApiResponse<AttendancePolicy>>('/attendance-policy');
export const updateAttendancePolicy = (data: Partial<AttendancePolicy>) => apiClient<ApiResponse<AttendancePolicy>>('/attendance-policy', { method: 'PATCH', body: JSON.stringify(data) });
export const getHolidays = (academicYear?: string) => apiClient<ApiResponse<Holiday[]>>(`/holidays${queryString({ academicYear })}`);
export const createHoliday = (data: Partial<Holiday>) => apiClient<ApiResponse<Holiday>>('/holidays', { method: 'POST', body: JSON.stringify(data) });
export const updateHoliday = (id: string, data: Partial<Holiday>) => apiClient<ApiResponse<Holiday>>(`/holidays/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteHoliday = (id: string) => apiClient<void>(`/holidays/${id}`, { method: 'DELETE' });
export const getCorrectionRequests = (status?: string) => apiClient<ApiResponse<AttendanceReviewRequest[]>>(`/correction-requests${queryString({ status })}`);
export const approveCorrectionRequest = (id: string, adminNote?: string) => apiClient<ApiResponse<AttendanceReviewRequest>>(`/correction-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ adminNote }) });
export const rejectCorrectionRequest = (id: string, adminNote?: string) => apiClient<ApiResponse<AttendanceReviewRequest>>(`/correction-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ adminNote }) });
export const getLeaveRequests = (status?: string) => apiClient<ApiResponse<LeaveRequest[]>>(`/leave-requests${queryString({ status })}`);
export const approveLeaveRequest = (id: string, adminNote?: string) => apiClient<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/approve`, { method: 'POST', body: JSON.stringify({ adminNote }) });
export const rejectLeaveRequest = (id: string, adminNote?: string) => apiClient<ApiResponse<LeaveRequest>>(`/leave-requests/${id}/reject`, { method: 'POST', body: JSON.stringify({ adminNote }) });
