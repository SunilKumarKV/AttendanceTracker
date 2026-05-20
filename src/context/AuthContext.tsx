import React, { createContext, useContext, useState } from 'react';
import { User, AuthState, Role } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, role: Role) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const savedUser = localStorage.getItem('attendance_pro_user');
    if (savedUser) {
      return {
        user: JSON.parse(savedUser),
        isAuthenticated: true,
      };
    }
    return {
      user: null,
      isAuthenticated: false,
    };
  });

  const login = (email: string, role: Role): boolean => {
    // Mock validation based on requirements
    const isAdmin = email === 'admin@college.edu' && role === 'Admin';
    const isProf = email === 'prof@college.edu' && role === 'Professor';

    if (isAdmin || isProf) {
      const user: User = {
        name: isAdmin ? 'System Admin' : 'Dr. Professor',
        email,
        role,
      };
      setState({ user, isAuthenticated: true });
      localStorage.setItem('attendance_pro_user', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState({ user: null, isAuthenticated: false });
    // Clear all relevant localStorage keys
    localStorage.removeItem('attendance_pro_user');
    localStorage.removeItem('adminProfile');
    localStorage.removeItem('appSettings');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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
