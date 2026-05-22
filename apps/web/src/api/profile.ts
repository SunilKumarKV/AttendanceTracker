import { apiClient } from './client';
import { User } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ProfileData extends User {
  phone: string;
  college: string;
  department: string;
  employeeId: string;
  avatar: string;
  preferences: Record<string, unknown>;
}

export const getProfile = () => (
  apiClient<ApiResponse<ProfileData>>('/profile/me')
);

export const updateProfile = (data: Partial<ProfileData> & { avatarDataUrl?: string | null }) => (
  apiClient<ApiResponse<ProfileData>>('/profile/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);

export const updateProfilePassword = (data: { currentPassword: string; newPassword: string }) => (
  apiClient<{ success: boolean }>('/profile/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
);
