import { apiClient } from './client';
import { User } from '../types';

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
  };
}

interface SuccessResponse {
  success: boolean;
}

export const loginRequest = (email: string, password: string, institutionCode?: string) => (
  apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, institutionCode: institutionCode?.trim() || undefined }),
  })
);

export const refreshRequest = () => (
  apiClient<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({}),
  })
);

export const logoutRequest = () => (
  apiClient<SuccessResponse>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
);

export const forgotPasswordRequest = (email: string) => (
  apiClient<{ success: boolean; message?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
);

export const resetPasswordRequest = (token: string, password: string) => (
  apiClient<{ success: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
);
