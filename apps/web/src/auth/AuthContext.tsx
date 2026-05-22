import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, refreshRequest } from '../api/auth';
import { AuthState, Role, User } from '../types';
import {
  clearAuthToken,
  clearRefreshToken,
  clearStoredUser,
  getStoredUser,
  setAuthToken,
  setStoredUser,
} from './authStorage';

interface AuthContextType extends AuthState {
  currentUser: User | null;
  role: Role | null;
  isAuthLoading: boolean;
  login: (email: string, password: string, institutionCode?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => ({
    user: getStoredUser(),
    isAuthenticated: false,
  }));
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      clearRefreshToken();
      try {
        const response = await refreshRequest();
        if (!mounted) return;
        const { user, accessToken } = response.data;
        setAuthToken(accessToken);
        setStoredUser(user);
        setState({ user, isAuthenticated: true });
      } catch {
        if (!mounted) return;
        clearAuthToken();
        clearStoredUser();
        setState({ user: null, isAuthenticated: false });
      } finally {
        if (mounted) setIsAuthLoading(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string, institutionCode?: string): Promise<User> => {
    const response = await loginRequest(email, password, institutionCode);
    const { user, accessToken } = response.data;

    clearRefreshToken();
    setAuthToken(accessToken);
    setStoredUser(user);
    setState({ user, isAuthenticated: true });

    return user;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Local session should still be cleared if the server is unreachable.
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
    isAuthLoading,
    login,
    logout,
    updateCurrentUser,
  }), [isAuthLoading, state]);

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
