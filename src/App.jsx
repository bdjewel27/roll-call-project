import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ROLES } from './constants/roles';
import { useAuth } from './hooks/useAuth';

// Auth & Fallback pages (lazy loaded)
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage').then(m => ({ default: m.UnauthorizedPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Admin pages (lazy loaded)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const ClassManagement = lazy(() => import('./pages/admin/ClassManagement').then(m => ({ default: m.ClassManagement })));
const TeacherManagement = lazy(() => import('./pages/admin/TeacherManagement').then(m => ({ default: m.TeacherManagement })));
const StudentManagement = lazy(() => import('./pages/admin/StudentManagement').then(m => ({ default: m.StudentManagement })));
const AssignTeachers = lazy(() => import('./pages/admin/AssignTeachers').then(m => ({ default: m.AssignTeachers })));
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })));

// Teacher pages (lazy loaded)
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard').then(m => ({ default: m.TeacherDashboard })));
const MyClasses = lazy(() => import('./pages/teacher/MyClasses').then(m => ({ default: m.MyClasses })));
const MarkAttendance = lazy(() => import('./pages/teacher/MarkAttendance').then(m => ({ default: m.MarkAttendance })));
const AttendanceHistory = lazy(() => import('./pages/teacher/AttendanceHistory').then(m => ({ default: m.AttendanceHistory })));
const TeacherReports = lazy(() => import('./pages/teacher/TeacherReports').then(m => ({ default: m.TeacherReports })));

// Root redirect handler based on active session & role
const RootRedirect = () => {
  const { user, isAdmin, isTeacher } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (isTeacher) {
    return <Navigate to="/teacher/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
};

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <p>Loading...</p>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public Auth Route */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />

                {/* Root redirect */}
                <Route path="/" element={<RootRedirect />} />

              {/* Admin Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="classes" element={<ClassManagement />} />
                <Route path="teachers" element={<TeacherManagement />} />
                <Route path="students" element={<StudentManagement />} />
                <Route path="assign" element={<AssignTeachers />} />
                <Route path="reports" element={<ReportsPage />} />
              </Route>

              {/* Teacher Protected Routes */}
              <Route
                path="/teacher"
                element={
                  <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="classes" element={<MyClasses />} />
                <Route path="attendance" element={<MarkAttendance />} />
                <Route path="history" element={<AttendanceHistory />} />
                <Route path="reports" element={<TeacherReports />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
