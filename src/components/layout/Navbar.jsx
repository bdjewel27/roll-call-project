import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Sun, Moon, Menu } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles';

export const Navbar = ({ onToggleMobileNav }) => {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="app-navbar">
      {/* Left: Mobile hamburger & Logo */}
      <div className="navbar-brand-section">
        <button
          type="button"
          onClick={onToggleMobileNav}
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="navbar-logo-wrap">
          <div className="navbar-logo-badge">
            RC
          </div>
          <div className="navbar-brand-text">
            <span className="navbar-brand-title">
              RollCall
            </span>
            <span className="navbar-brand-suffix">
              System
            </span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle & User Info & Logout */}
      <div className="navbar-actions-section">
        {/* Theme switcher */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="navbar-theme-btn"
        >
          {isDark ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#64748b" />}
        </button>

        {user && (
          <div className="navbar-user-block">
            <div className="navbar-user-info">
              <div className="navbar-username" title={user.fullName || user.email}>
                {user.fullName || user.email}
              </div>
              <span
                className={`navbar-role-badge ${isAdmin ? 'role-admin' : 'role-teacher'}`}
              >
                <span className="role-text-full">{ROLE_LABELS[user.role] || user.role}</span>
                <span className="role-text-compact">{isAdmin ? 'Admin' : 'Teacher'}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Logout"
              aria-label="Logout"
              className="navbar-logout-btn"
            >
              <LogOut size={16} />
              <span className="logout-text">Logout</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        .app-navbar {
          height: 64px;
          background-color: var(--bg-header);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          position: sticky;
          top: 0;
          z-index: 30;
          transition: background-color 0.2s, border-color 0.2s;
          width: 100%;
          max-width: 100vw;
          box-sizing: border-box;
          overflow: hidden;
        }

        .navbar-brand-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
          flex-shrink: 0;
        }

        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          padding: 0.4rem;
          color: var(--text-primary);
          border-radius: 6px;
          cursor: pointer;
        }

        .navbar-logo-wrap {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          user-select: none;
        }

        .navbar-logo-badge {
          width: 36px;
          height: 36px;
          background-color: var(--primary);
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-weight: 800;
          font-size: 1.05rem;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          flex-shrink: 0;
        }

        .navbar-brand-text {
          display: flex;
          align-items: baseline;
        }

        .navbar-brand-title {
          font-weight: 700;
          font-size: 1.15rem;
          color: var(--text-primary);
        }

        .navbar-brand-suffix {
          color: var(--primary);
          font-weight: 600;
          font-size: 1.15rem;
          margin-left: 4px;
        }

        .navbar-actions-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 0;
          flex-shrink: 1;
          justify-content: flex-end;
        }

        .navbar-theme-btn {
          background: var(--bg-subtle);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.5rem;
          color: var(--text-primary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background-color 0.15s, border-color 0.15s;
        }

        .navbar-user-block {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          min-width: 0;
          flex-shrink: 1;
        }

        .navbar-user-info {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          min-width: 0;
        }

        .navbar-username {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.25;
        }

        .navbar-role-badge {
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          padding: 0.1rem 0.45rem;
          border-radius: 4px;
          margin-top: 2px;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
        }

        .role-admin {
          background-color: var(--primary-light);
          color: var(--primary-text);
          border: 1px solid var(--border-color);
        }

        .role-teacher {
          background-color: var(--status-present-bg);
          color: var(--status-present-text);
          border: 1px solid var(--status-present-border);
        }

        .role-text-full {
          display: inline;
          text-transform: uppercase;
        }

        .role-text-compact {
          display: none;
        }

        .navbar-logout-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background-color: var(--bg-subtle);
          color: var(--status-absent-text);
          font-size: 0.85rem;
          font-weight: 500;
          cursor: pointer;
          flex-shrink: 0;
          transition: background-color 0.15s, border-color 0.15s;
        }

        @media (max-width: 768px) {
          .mobile-menu-btn {
            display: flex !important;
          }
          .logout-text {
            display: none !important;
          }
        }

        @media (max-width: 640px) {
          .app-navbar {
            height: 56px;
            padding: 0 0.6rem;
          }
          .navbar-brand-section {
            gap: 0.4rem;
          }
          .navbar-logo-wrap {
            gap: 0.45rem;
          }
          .navbar-logo-badge {
            width: 30px;
            height: 30px;
            font-size: 0.9rem;
            border-radius: 7px;
          }
          .navbar-brand-title {
            font-size: 1rem;
          }
          .navbar-actions-section {
            gap: 0.4rem;
            flex-wrap: nowrap;
          }
          .navbar-theme-btn {
            padding: 0.35rem;
            border-radius: 6px;
          }
          .navbar-user-block {
            gap: 0.4rem;
          }
          .navbar-username {
            font-size: 0.775rem;
            max-width: 80px;
          }
          .navbar-role-badge {
            font-size: 0.65rem;
            padding: 0.05rem 0.35rem;
          }
          .role-text-full {
            display: none !important;
          }
          .role-text-compact {
            display: inline !important;
          }
          .navbar-logout-btn {
            padding: 0.35rem 0.45rem;
            border-radius: 6px;
          }
        }

        @media (max-width: 480px) {
          .navbar-brand-suffix {
            display: none;
          }
          .navbar-username {
            max-width: 72px;
          }
        }

        @media (max-width: 360px) {
          .navbar-username {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
