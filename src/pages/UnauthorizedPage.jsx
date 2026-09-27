import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ROLES } from '../constants/roles';

export const UnauthorizedPage = () => {
  const { role } = useAuth();
  const homePath = role === ROLES.ADMIN ? '/admin/dashboard' : '/teacher/dashboard';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-page)',
        padding: '1.5rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <ShieldAlert size={56} color="var(--status-absent)" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
          Access Denied
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 1.5rem' }}>
          You do not have administrative permission to view this page.
        </p>
        <Link
          to={homePath}
          style={{
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};
