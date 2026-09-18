import React from 'react';
import { ATTENDANCE_STATUS } from '../../constants/attendanceStatus';

export const StatusBadge = ({ status }) => {
  const normalized = status?.toLowerCase();

  let label = status || 'Unknown';
  let bg = 'var(--bg-subtle)';
  let color = 'var(--text-secondary)';
  let border = 'var(--border-color)';
  let dotColor = 'var(--text-muted)';

  if (normalized === ATTENDANCE_STATUS.PRESENT) {
    label = 'Present';
    bg = 'var(--status-present-bg)';
    color = 'var(--status-present-text)';
    border = 'var(--status-present-border)';
    dotColor = 'var(--status-present)';
  } else if (normalized === ATTENDANCE_STATUS.ABSENT) {
    label = 'Absent';
    bg = 'var(--status-absent-bg)';
    color = 'var(--status-absent-text)';
    border = 'var(--status-absent-border)';
    dotColor = 'var(--status-absent)';
  } else if (normalized === ATTENDANCE_STATUS.LATE) {
    label = 'Late';
    bg = 'var(--status-late-bg)';
    color = 'var(--status-late-text)';
    border = 'var(--status-late-border)';
    dotColor = 'var(--status-late)';
  } else if (normalized === ATTENDANCE_STATUS.LEAVE) {
    label = 'Leave';
    bg = 'var(--status-leave-bg)';
    color = 'var(--status-leave-text)';
    border = 'var(--status-leave-border)';
    dotColor = 'var(--status-leave)';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.25rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        lineHeight: 1.2,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          marginRight: '0.375rem',
        }}
      />
      {label}
    </span>
  );
};
