import { User } from '../types';

const USER_STORAGE_KEY = 'attendance_pro_user';
const TOKEN_STORAGE_KEY = 'authToken';
const REFRESH_TOKEN_STORAGE_KEY = 'refreshToken';

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

export const getAuthToken = () => sessionStorage.getItem(TOKEN_STORAGE_KEY);

export const setAuthToken = (token: string) => {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);

export const setRefreshToken = (token: string) => {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
};

export const clearRefreshToken = () => {
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
};
