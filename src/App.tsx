import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { MarkAttendance } from './components/MarkAttendance';
import { MainLayout } from './components/MainLayout';
import { Profile } from './components/Profile';
import { ProfessorProfile } from './components/ProfessorProfile';
import { Settings } from './components/Settings';
import { Students } from './components/Students';
import { Notifications } from './components/Notifications';
import { Reports } from './components/Reports';
import { ManageProfessors } from './components/ManageProfessors';
import { PlaceholderPage } from './components/PlaceholderPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; role?: string; restrictedForProf?: boolean }> = ({ children, role, restrictedForProf }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Specific restriction: Professors cannot access /students or /settings
  if (restrictedForProf && user?.role === 'Professor') {
    return <Navigate to="/mark-attendance" replace />;
  }

  if (role && user?.role !== role) {
    // Basic role mismatch handling
    return <Navigate to={user?.role === 'Admin' ? '/dashboard' : '/mark-attendance'} replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Admin & Professor Shared Routes */}
          <Route
            path="/mark-attendance"
            element={
              <ProtectedRoute>
                <MarkAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professor-profile"
            element={
              <ProtectedRoute role="Professor">
                <ProfessorProfile />
              </ProtectedRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="Admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-professors"
            element={
              <ProtectedRoute role="Admin">
                <ManageProfessors />
              </ProtectedRoute>
            }
          />

          {/* Routes restricted for Professors (redirect to /mark-attendance) */}
          <Route
            path="/students"
            element={
              <ProtectedRoute restrictedForProf>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute restrictedForProf>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute role="Admin">
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Professor Specific Routes */}
          <Route
            path="/my-students"
            element={
              <ProtectedRoute role="Professor">
                <PlaceholderPage title="My Students" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-reports"
            element={
              <ProtectedRoute role="Professor">
                <PlaceholderPage title="My Reports" />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  </AuthProvider>
);
}
