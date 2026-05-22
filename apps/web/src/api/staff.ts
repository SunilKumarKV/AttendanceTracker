import { apiClient } from './client';

interface ApiResponse<T> { success: boolean; data: T }
interface Paginated<T> { items: T[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }

export interface StaffMember {
  id: string;
  employeeCode: string;
  staffRole: string;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  isActive: boolean;
  user: { id: string; name: string; email: string; role: string; isActive?: boolean };
}

export interface StaffAttendanceRecord {
  id: string;
  staffId: string;
  attendanceDate: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'LEAVE';
  remarks?: string | null;
  staff?: StaffMember;
}

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNote?: string | null;
  staff?: StaffMember;
}

export interface StaffSummary {
  totalStaff: number;
  todayAttendance: number;
  absentToday: number;
  pendingLeaves: number;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export const getStaffSummary = () => apiClient<ApiResponse<StaffSummary>>('/admin/staff/summary');
export const getStaffMembers = (search = '', page = 1, pageSize = 50) => apiClient<ApiResponse<Paginated<StaffMember>>>(`/admin/staff${qs({ search, page, pageSize })}`);
export const createStaffMember = (data: Record<string, unknown>) => apiClient<ApiResponse<StaffMember>>('/admin/staff', { method: 'POST', body: JSON.stringify(data) });
export const updateStaffMember = (id: string, data: Record<string, unknown>) => apiClient<ApiResponse<StaffMember>>(`/admin/staff/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteStaffMember = (id: string) => apiClient<void>(`/admin/staff/${id}`, { method: 'DELETE' });
export const markStaffAttendance = (data: Record<string, unknown>) => apiClient<ApiResponse<StaffAttendanceRecord>>('/admin/staff-attendance', { method: 'POST', body: JSON.stringify(data) });
export const getStaffAttendance = (params: Record<string, string | number | undefined> = {}) => apiClient<ApiResponse<StaffAttendanceRecord[]>>(`/admin/staff-attendance${qs(params)}`);
export const getStaffLeaves = (status = '') => apiClient<ApiResponse<StaffLeaveRequest[]>>(`/admin/staff-leaves${qs({ status })}`);
export const createStaffLeave = (data: Record<string, unknown>) => apiClient<ApiResponse<StaffLeaveRequest>>('/staff/leaves', { method: 'POST', body: JSON.stringify(data) });
export const approveStaffLeave = (id: string, adminNote = '') => apiClient<ApiResponse<StaffLeaveRequest>>(`/admin/staff-leaves/${id}/approve`, { method: 'POST', body: JSON.stringify({ adminNote }) });
export const rejectStaffLeave = (id: string, adminNote = '') => apiClient<ApiResponse<StaffLeaveRequest>>(`/admin/staff-leaves/${id}/reject`, { method: 'POST', body: JSON.stringify({ adminNote }) });
export const getMyStaffDashboard = () => apiClient<ApiResponse<any>>('/staff/dashboard');
export const getMyStaffLeaves = () => apiClient<ApiResponse<StaffLeaveRequest[]>>('/staff/leaves');
export const getMyStaffAttendance = () => apiClient<ApiResponse<StaffAttendanceRecord[]>>('/staff/attendance');

export const staffReportUrl = (format: 'csv' | 'xlsx' | 'pdf') => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}/admin/staff-reports/export?format=${format}`;
};
export const myStaffReportUrl = (format: 'csv' | 'xlsx' | 'pdf') => {
  const base = import.meta.env.VITE_API_BASE_URL ?? '';
  return `${base}/staff/reports/export?format=${format}`;
};

const download = async (url: string, filename: string) => {
  const { getAuthToken } = await import('../auth/authStorage');
  const response = await fetch(url, { headers: { Authorization: `Bearer ${getAuthToken() ?? ''}` }, credentials: 'include' });
  if (!response.ok) throw new Error('Could not download staff report.');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
};
export const downloadStaffReport = (format: 'csv' | 'xlsx' | 'pdf') => download(staffReportUrl(format), `staff-attendance-report.${format === 'xlsx' ? 'xls' : format}`);
export const downloadMyStaffReport = (format: 'csv' | 'xlsx' | 'pdf') => download(myStaffReportUrl(format), `my-staff-attendance-report.${format === 'xlsx' ? 'xls' : format}`);
