import { apiClient } from './client';

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

export interface NotificationLog {
  id: string;
  createdAt: string;
  sentAt: string | null;
  channel: string;
  recipient: string;
  subject: string | null;
  message: string;
  status: 'Delivered' | 'Failed' | 'Skipped' | string;
  provider: string | null;
  providerRef: string | null;
  recipientType: string;
  reason: string;
  attendanceSessionId: string | null;
  studentId: string | null;
  studentName: string;
  rollNo: string;
  className: string;
  sectionName: string;
  type: 'Absent Alert' | 'Low Attendance' | 'Monthly Report' | string;
}

export interface NotificationSettings {
  minimumAttendancePct: number;
  warningAttendancePct: number;
  criticalAttendancePct: number;
  severeAttendancePct: number;
  notificationEnabled: boolean;
  absentAlertsEnabled: boolean;
  lowAttendanceAlertsEnabled: boolean;
  monthlyReportsEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  alertTimingPreference: string;
  supportEmail: string;
  smtpConfigured: boolean;
}

export interface NotificationFilters {
  search?: string;
  channel?: string;
  status?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

const queryString = (params: NotificationFilters) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

export const getNotificationLogs = (filters: NotificationFilters) => (
  apiClient<ApiResponse<Paginated<NotificationLog>>>(`/notifications${queryString(filters)}`)
);

export const runLowAttendanceSweep = () => (
  apiClient<ApiResponse<{ processed: number; delivered: number; skipped: number; failed: number }>>('/notifications/run-low-attendance-sweep', {
    method: 'POST',
  })
);

export const sendTestNotification = (data: {
  channel: 'email' | 'sms' | 'whatsapp';
  recipient?: string;
  rule: 'absent_alert' | 'low_attendance_alert' | 'monthly_report_alert';
}) => (
  apiClient<ApiResponse<NotificationLog>>('/notifications/test', {
    method: 'POST',
    body: JSON.stringify(data),
  })
);

export const getNotificationSettings = () => (
  apiClient<ApiResponse<NotificationSettings>>('/settings/notifications')
);

export const updateNotificationSettings = (data: Partial<NotificationSettings>) => (
  apiClient<ApiResponse<NotificationSettings>>('/settings/notifications', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export interface LowAttendanceStudent {
  id: string;
  name: string;
  rollNumber: string;
  email: string | null;
  phone: string | null;
  parentName: string | null;
  parentEmail: string | null;
  parentPhone: string | null;
  className: string;
  sectionName: string;
  attendancePercentage: number;
  attendedClasses: number;
  totalClasses: number;
  severity: 'WARNING' | 'CRITICAL' | 'SEVERE' | string;
  lastAlertStatus: string;
  whatsappLink: string;
  whatsappMessage: string;
}

export interface CommunicationTemplate {
  id: string;
  key: 'low_attendance_warning' | 'low_attendance_critical' | 'low_attendance_severe' | 'monthly_report';
  channel: 'email' | 'whatsapp';
  name: string;
  subject: string | null;
  body: string;
  isActive: boolean;
}

export const getLowAttendanceStudents = () => (
  apiClient<ApiResponse<LowAttendanceStudent[]>>('/communications/low-attendance')
);

export const getCommunicationTemplates = () => (
  apiClient<ApiResponse<CommunicationTemplate[]>>('/communications/templates')
);

export const updateCommunicationTemplate = (id: string, data: Partial<CommunicationTemplate>) => (
  apiClient<ApiResponse<CommunicationTemplate>>(`/communications/templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export const sendStudentAlert = (data: {
  studentId: string;
  channel: 'email' | 'whatsapp';
  type: 'low_attendance_alert' | 'monthly_report_alert';
  recipientType: 'student' | 'parent';
  manual?: boolean;
}) => (
  apiClient<ApiResponse<{ log: NotificationLog; whatsappLink: string | null; message: string }>>('/communications/send-alert', {
    method: 'POST',
    body: JSON.stringify(data),
  })
);
