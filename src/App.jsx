import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { ROLES } from './constants/roles';

// Auth & Fallback pages
import { LoginPage } from './pages/auth/LoginPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Admin pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ClassManagement } from './pages/admin/ClassManagement';
import { TeacherManagement } from './pages/admin/TeacherManagement';
import { StudentManagement } from './pages/admin/StudentManagement';
import { AssignTeachers } from './pages/admin/AssignTeachers';
import { ReportsPage } from './pages/admin/ReportsPage';

// Teacher pages
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { MyClasses } from './pages/teacher/MyClasses';
import { MarkAttendance } from './pages/teacher/MarkAttendance';
import { AttendanceHistory } from './pages/teacher/AttendanceHistory';
import { TeacherReports } from './pages/teacher/TeacherReports';

import { useAuth } from './hooks/useAuth';

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

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
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
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
