import { apiClient } from './client';
import { getAuthToken } from '../auth/authStorage';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  threshold?: number;
  month?: string;
}

export interface ReportStudent {
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string | null;
  className: string;
  sectionId: string | null;
  sectionName: string;
  totalClasses: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  attended: number;
  attendancePercentage: number;
  status: 'Regular' | 'Shortage';
}

export interface ReportOverview {
  summary: {
    totalClasses: number;
    averageAttendance: number;
    overallPresent: number;
    overallLate: number;
    overallExcused: number;
    overallAbsent: number;
    lowAttendanceCount: number;
    sessions: number;
    studentCount: number;
  };
  students: ReportStudent[];
}

export interface LowAttendanceReport {
  threshold: number;
  students: ReportStudent[];
}

export interface FilterOption {
  id: string;
  name: string;
  code?: string;
  courseId?: string;
}

interface Paginated<T> {
  items: T[];
}

const queryString = (params: ReportFilters | Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

const download = async (path: string, filename: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const token = getAuthToken();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? payload?.message ?? 'Download failed');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const getReportOverview = (filters: ReportFilters) => (
  apiClient<ApiResponse<ReportOverview>>(`/reports/overview${queryString(filters)}`)
);

export const getLowAttendanceReport = (filters: ReportFilters) => (
  apiClient<ApiResponse<LowAttendanceReport>>(`/reports/low-attendance${queryString(filters)}`)
);

export const getMonthlyReport = (filters: ReportFilters) => (
  apiClient<ApiResponse<ReportOverview>>(`/reports/monthly${queryString(filters)}`)
);

export const downloadReportCsv = (filters: ReportFilters) => (
  download(`/reports/export/csv${queryString(filters)}`, `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`)
);

export const downloadReportPdf = (filters: ReportFilters) => (
  download(`/reports/export/pdf${queryString(filters)}`, `attendance_report_${new Date().toISOString().slice(0, 10)}.pdf`)
);

export const getReportFilterOptions = async () => {
  const [classes, subjects, sections] = await Promise.all([
    apiClient<ApiResponse<Paginated<FilterOption>>>('/classes?pageSize=100'),
    apiClient<ApiResponse<Paginated<FilterOption>>>('/subjects?pageSize=100'),
    apiClient<ApiResponse<Paginated<FilterOption>>>('/sections?pageSize=100'),
  ]);
  return {
    classes: classes.data.items,
    subjects: subjects.data.items,
    sections: sections.data.items,
  };
};
