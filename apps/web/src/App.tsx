import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Loader, ToastSetup } from './components/common';
import { ProtectedRoute, RoleRoute } from './routes';

const Login = lazy(() => import('./components/Login').then((module) => ({ default: module.Login })));
const ForgotPassword = lazy(() => import('./components/ForgotPassword').then((module) => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/ResetPassword').then((module) => ({ default: module.ResetPassword })));
const AuditLogs = lazy(() => import('./components/AuditLogs').then((module) => ({ default: module.AuditLogs })));
const AttendanceControl = lazy(() => import('./components/AttendanceControl').then((module) => ({ default: module.AttendanceControl })));
const TeacherRequests = lazy(() => import('./components/TeacherRequests').then((module) => ({ default: module.TeacherRequests }))); 
const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })));
const MarkAttendance = lazy(() => import('./components/MarkAttendance').then((module) => ({ default: module.MarkAttendance })));
const ProfessorDashboard = lazy(() => import('./components/ProfessorDashboard').then((module) => ({ default: module.ProfessorDashboard })));
const ProfessorStudents = lazy(() => import('./components/ProfessorStudents').then((module) => ({ default: module.ProfessorStudents })));
const AttendanceHistory = lazy(() => import('./components/AttendanceHistory').then((module) => ({ default: module.AttendanceHistory })));
const ProfessorReports = lazy(() => import('./components/ProfessorReports').then((module) => ({ default: module.ProfessorReports })));
const ProfessorSettings = lazy(() => import('./components/ProfessorSettings').then((module) => ({ default: module.ProfessorSettings })));
const Profile = lazy(() => import('./components/Profile').then((module) => ({ default: module.Profile })));
const ProfessorProfile = lazy(() => import('./components/ProfessorProfile').then((module) => ({ default: module.ProfessorProfile })));
const Settings = lazy(() => import('./components/Settings').then((module) => ({ default: module.Settings })));
const Students = lazy(() => import('./components/Students').then((module) => ({ default: module.Students })));
const Notifications = lazy(() => import('./components/Notifications').then((module) => ({ default: module.Notifications })));
const Communications = lazy(() => import('./components/Communications').then((module) => ({ default: module.Communications })));
const Reports = lazy(() => import('./components/Reports').then((module) => ({ default: module.Reports })));
const ManageProfessors = lazy(() => import('./components/ManageProfessors').then((module) => ({ default: module.ManageProfessors })));
const AcademicManagement = lazy(() => import('./components/AcademicManagement').then((module) => ({ default: module.AcademicManagement })));
const AcademicOperations = lazy(() => import('./components/AcademicOperations').then((module) => ({ default: module.AcademicOperations })));
const AcademicPortal = lazy(() => import('./components/AcademicPortal').then((module) => ({ default: module.AcademicPortal })));
const BehaviourRecords = lazy(() => import('./components/BehaviourRecords').then((module) => ({ default: module.BehaviourRecords })));
const LibraryLabManagement = lazy(() => import('./components/LibraryLabManagement').then((module) => ({ default: module.LibraryLabManagement })));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then((module) => ({ default: module.AnalyticsDashboard })));
const PlatformDashboard = lazy(() => import('./components/PlatformDashboard').then((module) => ({ default: module.PlatformDashboard })));
const PlatformAuditLogs = lazy(() =>
  import('./components/platform/PlatformAuditLogs').then((module) => ({
    default: module.PlatformAuditLogs,
  }))
);
const ActiveSessions = lazy(() =>
  import('./components/security/ActiveSessions').then((module) => ({
    default: module.ActiveSessions,
  }))
);
const BillingDashboard = lazy(() =>
  import('./components/billing/BillingDashboard').then((module) => ({
    default: module.BillingDashboard,
  }))
);

const StudentDashboard = lazy(() => import('./components/StudentDashboard').then((module) => ({ default: module.StudentDashboard })));
const StudentProfile = lazy(() => import('./components/StudentProfile').then((module) => ({ default: module.StudentProfile })));
const StudentNotifications = lazy(() => import('./components/StudentNotifications').then((module) => ({ default: module.StudentNotifications })));
const ParentDashboard = lazy(() => import('./components/ParentDashboard').then((module) => ({ default: module.ParentDashboard })));
const ParentNotifications = lazy(() => import('./components/ParentNotifications').then((module) => ({ default: module.ParentNotifications })));
const StaffManagement = lazy(() => import('./components/StaffManagement').then((module) => ({ default: module.StaffManagement })));
const StaffDashboard = lazy(() => import('./components/StaffDashboard').then((module) => ({ default: module.StaffDashboard })));


export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Router>
          <ToastSetup />
          <Suspense fallback={<Loader label="Loading page..." />}>
          <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          <Route
            path="/mark-attendance"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <MarkAttendance />
              </RoleRoute>
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
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <ProfessorProfile />
              </RoleRoute>
            }
          />


          <Route
            path="/platform"
            element={
              <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                <PlatformDashboard />
              </RoleRoute>
            }
          />

          <Route
  path="/platform/audit-logs"
  element={
    <RoleRoute allowedRoles={['SUPER_ADMIN']}>
      <PlatformAuditLogs />
    </RoleRoute>
  }
/>

<Route
  path="/security/sessions"
  element={
    <ProtectedRoute>
      <ActiveSessions />
    </ProtectedRoute>
  }
/>
<Route
  path="/billing"
  element={
    <RoleRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
      <BillingDashboard />
    </RoleRoute>
  }
/>
          <Route
            path="/dashboard"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <Dashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/manage-professors"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <ManageProfessors />
              </RoleRoute>
            }
          />
          <Route
            path="/academic-operations"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <AcademicOperations />
              </RoleRoute>
            }
          />

          <Route
            path="/academics"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <AcademicManagement />
              </RoleRoute>
            }
          />

          <Route
            path="/students"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <Students />
              </RoleRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <Settings />
              </RoleRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <Reports />
              </RoleRoute>
            }
          />
          <Route
            path="/attendance-control"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <AttendanceControl />
              </RoleRoute>
            }
          />

          <Route
            path="/audit-logs"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <AuditLogs />
              </RoleRoute>
            }
          />


          <Route
            path="/communications"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <Communications />
              </RoleRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <Notifications />
              </RoleRoute>
            }
          />

          <Route
            path="/professor-dashboard"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <ProfessorDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/my-students"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <ProfessorStudents />
              </RoleRoute>
            }
          />
          <Route
            path="/attendance-history"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <AttendanceHistory />
              </RoleRoute>
            }
          />
          <Route
            path="/my-reports"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <ProfessorReports />
              </RoleRoute>
            }
          />
          <Route
            path="/teacher-requests"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <TeacherRequests />
              </RoleRoute>
            }
          />

          <Route
            path="/teacher-academics"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <AcademicPortal />
              </RoleRoute>
            }
          />

          <Route
            path="/professor-settings"
            element={
              <RoleRoute allowedRoles={['TEACHER', 'PROFESSOR']}>
                <ProfessorSettings />
              </RoleRoute>
            }
          />


          <Route
            path="/student-dashboard"
            element={
              <RoleRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/student-report"
            element={
              <RoleRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/student-profile"
            element={
              <RoleRoute allowedRoles={['STUDENT']}>
                <StudentProfile />
              </RoleRoute>
            }
          />
          <Route
            path="/student-academics"
            element={
              <RoleRoute allowedRoles={['STUDENT']}>
                <AcademicPortal />
              </RoleRoute>
            }
          />
          <Route
            path="/student-notifications"
            element={
              <RoleRoute allowedRoles={['STUDENT']}>
                <StudentNotifications />
              </RoleRoute>
            }
          />
          <Route
            path="/parent-dashboard"
            element={
              <RoleRoute allowedRoles={['PARENT']}>
                <ParentDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/parent-report"
            element={
              <RoleRoute allowedRoles={['PARENT']}>
                <ParentDashboard />
              </RoleRoute>
            }
          />
          <Route
            path="/parent-academics"
            element={
              <RoleRoute allowedRoles={['PARENT']}>
                <AcademicPortal />
              </RoleRoute>
            }
          />
          <Route
            path="/parent-notifications"
            element={
              <RoleRoute allowedRoles={['PARENT']}>
                <ParentNotifications />
              </RoleRoute>
            }
          />


          <Route
            path="/staff-management"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD']}>
                <StaffManagement />
              </RoleRoute>
            }
          />
          <Route
            path="/staff-dashboard"
            element={
              <RoleRoute allowedRoles={['STAFF']}>
                <StaffDashboard />
              </RoleRoute>
            }
          />


          <Route
            path="/behaviour"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD', 'TEACHER', 'PROFESSOR', 'STUDENT', 'PARENT']}>
                <BehaviourRecords />
              </RoleRoute>
            }
          />



          <Route
            path="/analytics"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD', 'TEACHER', 'PROFESSOR']}>
                <AnalyticsDashboard />
              </RoleRoute>
            }
          />

          <Route
            path="/library-lab"
            element={
              <RoleRoute allowedRoles={['ADMIN', 'SUPER_ADMIN', 'HOD', 'STAFF']}>
                <LibraryLabManagement />
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
