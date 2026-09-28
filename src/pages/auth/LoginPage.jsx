import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { ROLES } from '../../constants/roles';
import { ShieldCheck, UserCheck, LogIn, Sun, Moon } from 'lucide-react';

export const LoginPage = () => {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLES.ADMIN);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = location.state?.from?.pathname;

  const getSafeRedirectPath = (fromPath, role) => {
    if (role === ROLES.ADMIN) {
      if (fromPath && (fromPath === '/admin' || fromPath.startsWith('/admin/'))) {
        return fromPath;
      }
      return '/admin/dashboard';
    }
    if (role === ROLES.TEACHER) {
      if (fromPath && (fromPath === '/teacher' || fromPath.startsWith('/teacher/'))) {
        return fromPath;
      }
      return '/teacher/dashboard';
    }
    return '/unauthorized';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setSubmitting(true);
    try {
      const loggedUser = await login(email.trim(), password);
      const destination = getSafeRedirectPath(from, loggedUser?.role);
      navigate(destination, { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Invalid login credentials. Please check your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-page)',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Top right theme toggle */}
      <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '0.5rem',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {isDark ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#64748b" />}
        </button>
      </div>

      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '16px',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              backgroundColor: 'var(--primary-light)',
              color: 'var(--primary)',
              borderRadius: '14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '0.75rem',
            }}
          >
            <LogIn size={26} />
          </div>
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', color: 'var(--text-primary)', fontWeight: 700 }}>
            Roll Call System
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Sign in to access your administrative or teaching portal
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            padding: '4px',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: '10px',
            marginBottom: '1.5rem',
          }}
        >
          <button
            type="button"
            aria-pressed={selectedRole === ROLES.ADMIN}
            onClick={() => setSelectedRole(ROLES.ADMIN)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: selectedRole === ROLES.ADMIN ? 600 : 500,
              backgroundColor: selectedRole === ROLES.ADMIN ? 'var(--bg-card)' : 'transparent',
              color: selectedRole === ROLES.ADMIN ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: selectedRole === ROLES.ADMIN ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <ShieldCheck size={16} color={selectedRole === ROLES.ADMIN ? 'var(--primary)' : 'var(--text-secondary)'} />
            Admin
          </button>

          <button
            type="button"
            aria-pressed={selectedRole === ROLES.TEACHER}
            onClick={() => setSelectedRole(ROLES.TEACHER)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.6rem',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: selectedRole === ROLES.TEACHER ? 600 : 500,
              backgroundColor: selectedRole === ROLES.TEACHER ? 'var(--bg-card)' : 'transparent',
              color: selectedRole === ROLES.TEACHER ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: selectedRole === ROLES.TEACHER ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <UserCheck size={16} color={selectedRole === ROLES.TEACHER ? 'var(--primary)' : 'var(--text-secondary)'} />
            Teacher
          </button>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="login-email" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              placeholder={selectedRole === ROLES.ADMIN ? 'admin@school.edu' : 'teacher@school.edu'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label htmlFor="login-password" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              style={{
                backgroundColor: 'var(--status-absent-bg, #fee2e2)',
                color: 'var(--status-absent-text, #b91c1c)',
                padding: '0.6rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.825rem',
                fontWeight: 500,
                border: '1px solid var(--status-absent-border, #fca5a5)',
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              marginTop: '0.5rem',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxShadow: 'var(--shadow-sm)',
              opacity: submitting ? 0.6 : 1,
              cursor: submitting ? 'not-allowed' : 'pointer',
              border: 'none',
            }}
          >
            {submitting ? 'Signing in...' : `Sign In as ${selectedRole === ROLES.ADMIN ? 'Admin' : 'Teacher'}`}
          </button>
        </form>
      </div>
    </div>
  );
};
