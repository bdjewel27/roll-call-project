import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard,
  School,
  GraduationCap,
  Users,
  UserCheck,
  ClipboardCheck,
  History,
  BarChart3,
  BookOpen,
  FileBarChart,
  X,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();

  const adminNavItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/classes', label: 'Class Management', icon: School },
    { to: '/admin/teachers', label: 'Teacher Management', icon: Users },
    { to: '/admin/students', label: 'Student Management', icon: GraduationCap },
    { to: '/admin/assign', label: 'Assign Teachers', icon: UserCheck },
    { to: '/admin/reports', label: 'Institutional Reports', icon: BarChart3 },
  ];

  const teacherNavItems = [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/classes', label: 'My Classes', icon: BookOpen },
    { to: '/teacher/attendance', label: 'Take Attendance', icon: ClipboardCheck },
    { to: '/teacher/history', label: 'Attendance History', icon: History },
    { to: '/teacher/reports', label: 'My Reports', icon: FileBarChart },
  ];

  const navItems = isAdmin ? adminNavItems : teacherNavItems;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(2px)',
            zIndex: 40,
            display: 'none',
          }}
        />
      )}

      <aside
        className={`app-sidebar ${isOpen ? 'open' : ''}`}
        style={{
          width: '240px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          minHeight: 'calc(100vh - 64px)',
          padding: '1.25rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.2s ease, background-color 0.2s',
          zIndex: 45,
        }}
      >
        {/* Header for Mobile drawer */}
        <div
          className="sidebar-mobile-header"
          style={{
            display: 'none',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0.5rem 1rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
            Navigation
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            fontSize: '0.725rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
            padding: '0 0.75rem 0.75rem',
          }}
        >
          {isAdmin ? 'Administration Portal' : 'Faculty Workspace'}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth <= 768 && onClose) {
                    onClose();
                  }
                }}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--primary-text)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                  border: isActive ? '1px solid var(--border-color)' : '1px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-backdrop { display: block !important; }
          .sidebar-mobile-header { display: flex !important; }
          .app-sidebar {
            position: fixed !important;
            top: 0;
            bottom: 0;
            left: 0;
            height: 100vh !important;
            transform: translateX(-100%);
            box-shadow: var(--shadow-lg);
          }
          .app-sidebar.open {
            transform: translateX(0) !important;
          }
        }
      `}</style>
    </>
  );
};
