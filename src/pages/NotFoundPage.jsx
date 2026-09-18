import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '1.5rem',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <HelpCircle size={56} color="#64748b" style={{ margin: '0 auto 1rem' }} />
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
          404 - Page Not Found
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1.5rem' }}>
          The page you requested does not exist or has moved.
        </p>
        <Link
          to="/"
          style={{
            backgroundColor: '#2563eb',
            color: '#ffffff',
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
};
