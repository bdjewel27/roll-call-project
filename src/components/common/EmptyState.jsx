import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items matching your criteria at this moment.',
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          marginBottom: '1rem',
        }}
      >
        <Icon size={28} />
      </div>
      <h4 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
        {title}
      </h4>
      <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '360px' }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
