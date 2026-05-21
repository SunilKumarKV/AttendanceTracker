import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader, ToastSetup } from './components/common';
import { ProtectedRoute, RoleRoute } from './routes';

const Login = lazy(() => import('./components/Login').then((module) => ({ default: module.Login })));
const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const MarkAttendance = lazy(() => import('./components/MarkAttendance').then((module) => ({ default: module.MarkAttendance })));
const ProfessorDashboard = lazy(() => import('./components/ProfessorDashboard').then((module) => ({ default: module.ProfessorDashboard })));
const Profile = lazy(() => import('./components/Profile').then((module) => ({ default: module.Profile })));
const ProfessorProfile = lazy(() => import('./components/ProfessorProfile').then((module) => ({ default: module.ProfessorProfile })));
const Settings = lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings })));
const Students = lazy(() => import('./components/Students').then((module) => ({ default: module.Students })));
const Notifications = lazy(() => import('./components/Notifications').then((module) => ({ default: module.Notifications })));
const Reports = lazy(() => import('./components/Reports').then((module) => ({ default: module.Reports })));
const ManageProfessors = lazy(() => import('./components/ManageProfessors').then((module) => ({ default: module.ManageProfessors })));
const PlaceholderPage = lazy(() => import('./components/PlaceholderPage').then((module) => ({ default: module.PlaceholderPage })));
const LandingPage = lazy(() => import('./pages').then((module) => ({ default: module.LandingPage })));
const DemoPage = lazy(() => import('./pages').then((module) => ({ default: module.DemoPage })));
const PricingPage = lazy(() => import('./pages').then((module) => ({ default: module.PricingPage })));
const TermsPage = lazy(() => import('./pages').then((module) => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('./pages').then((module) => ({ default: module.PrivacyPage })));

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <ToastSetup />
          <Suspense fallback={<Loader label="Loading page..." />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
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
              <RoleRoute allowedRoles={['PROFESSOR']}>
                <ProfessorProfile />
              </RoleRoute>
            }
          />

          {/* Admin Only Routes */}
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/manage-professors"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <ManageProfessors />
              </RoleRoute>
            }
          />

          {/* Routes restricted for Professors (redirect to /mark-attendance) */}
          <Route
            path="/students"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <Students />
              </RoleRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <Settings />
              </RoleRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']}>
                <Reports />
              </RoleRoute>
            }
          />

          {/* Professor Specific Routes */}
          <Route
            path="/professor-dashboard"
            element={
              <RoleRoute allowedRoles={['PROFESSOR']}>
                <ProfessorDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/my-students"
            element={
              <RoleRoute allowedRoles={['PROFESSOR']}>
                <PlaceholderPage title="My Students" />
              </RoleRoute>
            }
          />
          <Route
            path="/my-reports"
            element={
              <RoleRoute allowedRoles={['PROFESSOR']}>
                <PlaceholderPage title="My Reports" />
              </RoleRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  </AuthProvider>
);
}
