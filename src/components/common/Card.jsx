import React from 'react';

export const Card = ({ title, subtitle, extra, children, className = '', style = {} }) => {
  return (
    <div
      className={`app-card ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow-sm)',
        transition: 'background-color 0.2s, border-color 0.2s',
        ...style,
      }}
    >
      {(title || extra) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--border-color)',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            {title && (
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {title}
              </h3>
            )}
            {subtitle && (
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          {extra && <div>{extra}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
