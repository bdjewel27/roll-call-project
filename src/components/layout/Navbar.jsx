import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, Sun, Moon, Menu } from 'lucide-react';
import { ROLE_LABELS } from '../../constants/roles';

export const Navbar = ({ onToggleMobileNav }) => {
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--bg-header)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        transition: 'background-color 0.2s, border-color 0.2s',
      }}
    >
      {/* Left: Mobile hamburger & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={onToggleMobileNav}
          className="mobile-menu-btn"
          aria-label="Toggle navigation menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            padding: '0.4rem',
            color: 'var(--text-primary)',
            borderRadius: '6px',
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'var(--primary)',
              borderRadius: '9px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '1.05rem',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            }}
          >
            RC
          </div>
          <div>
            <span style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
              RollCall
            </span>
            <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '1.15rem', marginLeft: '4px' }}>
              System
            </span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle & User Info & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Theme switcher */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.5rem',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isDark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#64748b" />}
        </button>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user.fullName || user.email}
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '4px',
                  backgroundColor: isAdmin ? 'var(--primary-light)' : 'var(--status-present-bg)',
                  color: isAdmin ? 'var(--primary-text)' : 'var(--status-present-text)',
                  border: `1px solid ${isAdmin ? 'var(--border-color)' : 'var(--status-present-border)'}`,
                  marginTop: '2px',
                }}
              >
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>

            <button
              onClick={logout}
              title="Logout"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--status-absent-text)',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              <LogOut size={16} />
              <span className="logout-text">Logout</span>
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          .logout-text { display: none; }
        }
      `}</style>
    </header>
  );
};
