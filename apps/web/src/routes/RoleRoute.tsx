import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Role } from '../types';
import { Loader } from '../components/common';
import { ProtectedRoute } from './ProtectedRoute';

interface RoleRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

const getFallbackRoute = (role: Role | null) => (
  role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'HOD' ? '/dashboard' : role === 'STUDENT' ? '/student-dashboard' : role === 'PARENT' ? '/parent-dashboard' : '/professor-dashboard'
);

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isAuthLoading, role } = useAuth();

  if (isAuthLoading) {
    return <Loader label="Checking permissions..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={getFallbackRoute(role)} replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
};
