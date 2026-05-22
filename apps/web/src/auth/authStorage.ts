import { User } from '../types';

const USER_STORAGE_KEY = 'attendance_pro_user';

// Access tokens are intentionally held in memory only. Refresh tokens are issued
// by the backend as httpOnly cookies so browser JavaScript cannot read them.
let memoryAccessToken: string | null = null;

export const getStoredUser = (): User | null => {
  const savedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as User;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const setStoredUser = (user: User) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const getAuthToken = () => memoryAccessToken;

export const setAuthToken = (token: string) => {
  memoryAccessToken = token;
};

export const clearAuthToken = () => {
  memoryAccessToken = null;
};

export const clearRefreshToken = () => {
  // Remove legacy refresh/access tokens from older builds.
  localStorage.removeItem('refreshToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('authToken');
};
