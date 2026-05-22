import { apiClient } from './client';
import { getAuthToken } from '../auth/authStorage';

interface ApiResponse<T> { success: boolean; data: T }
export interface AnalyticsFilters { fromDate?: string; toDate?: string; classId?: string; sectionId?: string; subjectId?: string; teacherId?: string; studentId?: string; status?: string; threshold?: number; }
export interface AnalyticsKpis { totalStudents: number; totalStaff: number; attendanceSessions: number; records: number; attendancePercentage: number; present: number; absent: number; late: number; excused: number; lowAttendanceStudents: number; criticalRiskStudents: number; pendingCorrections: number; pendingLeaveApprovals: number; }
export interface AnalyticsOverview { dateRange: { fromDate: string; toDate: string }; kpis: AnalyticsKpis; staffAttendanceSummary: { status: string; count: number }[]; alertSummary: { status: string; count: number }[]; topLowAttendanceClasses: ChartDatum[]; mostAbsentStudents: RiskStudent[]; }
export interface ChartDatum { date?: string; week?: string; month?: string; className?: string; subjectName?: string; risk?: string; total?: number; present?: number; absent?: number; percentage?: number; count?: number; }
export interface AnalyticsCharts { daily: ChartDatum[]; weekly: ChartDatum[]; monthly: ChartDatum[]; classComparison: ChartDatum[]; subjectComparison: ChartDatum[]; lowAttendanceDistribution: ChartDatum[]; }
export interface RiskStudent { studentId: string; studentName: string; rollNumber: string; className: string; sectionName: string; totalClasses: number; present: number; absent: number; late: number; excused: number; percentage: number; riskCategory: 'low' | 'medium' | 'high' | 'critical'; frequentlyAbsent: boolean; droppingTrend: boolean; }
export interface RiskInsights { threshold: number; belowThreshold: RiskStudent[]; frequentlyAbsent: RiskStudent[]; droppingTrend: RiskStudent[]; all: RiskStudent[]; }
export interface TeacherInsights { teachers: { teacherId: string; teacherName: string; email: string; classesHandled: number; subjectsHandled: number; sessionsSubmitted: number; attendanceSubmissionConsistency: number; pendingAttendanceDays: number; subjectSummary: { subjectId: string; subjectName: string; sessions: number; records: number }[] }[]; }
export interface AnalyticsFilterOptions { classes: { id: string; name: string; code?: string }[]; sections: { id: string; name: string; courseId: string }[]; subjects: { id: string; name: string; code?: string; courseId: string }[]; teachers: { id: string; name: string; email: string }[]; students: { id: string; name: string; rollNumber: string; courseId: string; sectionId: string }[]; }

const qs = (params: Record<string, unknown>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== '') search.set(key, String(value)); });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export const getAnalyticsOverview = (filters: AnalyticsFilters = {}) => apiClient<ApiResponse<AnalyticsOverview>>(`/analytics/overview${qs(filters)}`);
export const getAnalyticsCharts = (filters: AnalyticsFilters = {}) => apiClient<ApiResponse<AnalyticsCharts>>(`/analytics/charts${qs(filters)}`);
export const getRiskInsights = (filters: AnalyticsFilters = {}) => apiClient<ApiResponse<RiskInsights>>(`/analytics/risks${qs(filters)}`);
export const getTeacherInsights = (filters: AnalyticsFilters = {}) => apiClient<ApiResponse<TeacherInsights>>(`/analytics/teachers${qs(filters)}`);
export const getAnalyticsFilterOptions = () => apiClient<ApiResponse<AnalyticsFilterOptions>>('/analytics/filters');

const download = async (path: string, filename: string) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';
  const token = getAuthToken();
  const response = await fetch(`${baseUrl}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  if (!response.ok) throw new Error('Analytics export failed');
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

export const downloadAnalyticsExport = (format: 'csv' | 'xlsx' | 'pdf', type: 'summary' | 'risks' | 'classes' | 'subjects', filters: AnalyticsFilters = {}) => download(`/analytics/export${qs({ ...filters, format, type })}`, `analytics-${type}.${format === 'xlsx' ? 'xls' : format}`);
