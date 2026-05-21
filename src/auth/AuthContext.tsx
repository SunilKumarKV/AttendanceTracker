import React, { createContext, useContext, useMemo, useState } from 'react';
import { loginRequest, logoutRequest } from '../api/auth';
import { AuthState, Role, User } from '../types';
import {
  clearAuthToken,
  clearRefreshToken,
  clearStoredUser,
  getAuthToken,
  getRefreshToken,
  getStoredUser,
  setAuthToken,
  setRefreshToken,
  setStoredUser,
} from './authStorage';

interface AuthContextType extends AuthState {
  currentUser: User | null;
  role: Role | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const user = getStoredUser();
    const accessToken = getAuthToken();

    if (user && !accessToken) {
      clearStoredUser();
      clearRefreshToken();
    }

    return {
      user: accessToken ? user : null,
      isAuthenticated: Boolean(user && accessToken),
    };
  });

  const login = async (email: string, password: string): Promise<User> => {
    const response = await loginRequest(email, password);
    const { user, accessToken, refreshToken } = response.data;

    setAuthToken(accessToken);
    setRefreshToken(refreshToken);
    setStoredUser(user);
    setState({ user, isAuthenticated: true });

    return user;
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();

    if (refreshToken) {
      try {
        await logoutRequest(refreshToken);
      } catch {
        // Local session should still be cleared if the server is unreachable.
      }
    }

    setState({ user: null, isAuthenticated: false });
    clearStoredUser();
    clearAuthToken();
    clearRefreshToken();
    localStorage.removeItem('adminProfile');
  };

  const updateCurrentUser = (user: User) => {
    setStoredUser(user);
    setState({ user, isAuthenticated: true });
  };

  const value = useMemo<AuthContextType>(() => ({
    ...state,
    currentUser: state.user,
    role: state.user?.role ?? null,
    login,
    logout,
    updateCurrentUser,
  }), [state]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
