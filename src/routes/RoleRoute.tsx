import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Role } from '../types';
import { ProtectedRoute } from './ProtectedRoute';

interface RoleRouteProps {
  allowedRoles: Role[];
  children: React.ReactNode;
}

const getFallbackRoute = (role: Role | null) => (
  role === 'ADMIN' || role === 'SUPER_ADMIN' ? '/dashboard' : '/mark-attendance'
);

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={getFallbackRoute(role)} replace />;
  }

  return <ProtectedRoute>{children}</ProtectedRoute>;
};
