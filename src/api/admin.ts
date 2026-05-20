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

export interface Professor extends User {
  id: string;
  employeeId: string;
  status: 'Active' | 'Inactive';
}

export interface DashboardData {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  below75Count: number;
  chartData: { name: string; percentage: number }[];
  atRiskStudents: { name: string; rollNo: string; phone: string; attendancePercentage: number }[];
  recentActivity: { date: string; subject: string; professor: string; present: number; absent: number }[];
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
