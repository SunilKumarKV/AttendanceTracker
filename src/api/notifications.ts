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
  studentId: string | null;
  studentName: string;
  rollNo: string;
  className: string;
  sectionName: string;
  type: 'Absent Alert' | 'Low Attendance' | 'Monthly Report' | string;
}

export interface NotificationSettings {
  minimumAttendancePct: number;
  notificationEnabled: boolean;
  absentAlertsEnabled: boolean;
  lowAttendanceAlertsEnabled: boolean;
  monthlyReportsEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
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
