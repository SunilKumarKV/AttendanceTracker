import { apiClient } from './client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface AppSettingsData {
  institution: {
    id?: string;
    name: string;
    code: string;
    email: string;
    phone: string;
    address: string;
  };
  academicYear: string;
  principalName: string;
  theme: 'light' | 'dark';
  attendanceLockAfterSubmit: boolean;
  timezone: string;
  minimumAttendancePct: number;
  notificationEnabled: boolean;
}

export const getAppSettings = () => (
  apiClient<ApiResponse<AppSettingsData>>('/settings')
);

export const updateAppSettings = (data: Partial<AppSettingsData>) => (
  apiClient<ApiResponse<AppSettingsData>>('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);
