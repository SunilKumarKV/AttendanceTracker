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
