import { apiClient } from './client';
import { User } from '../types';

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

interface SuccessResponse {
  success: boolean;
}

export const loginRequest = (email: string, password: string) => (
  apiClient<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
);

export const refreshRequest = (refreshToken: string) => (
  apiClient<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
);

export const logoutRequest = (refreshToken?: string) => (
  apiClient<SuccessResponse>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
);
