import React from 'react';
import { Card } from './Card';

/**
 * StatCard
 * Reusable KPI / metric stat card composing the shared Card component.
 *
 * Props:
 * - icon: Lucide icon component
 * - title: Metric label
 * - value: Metric primary value (string, number, or ReactNode)
 * - unit: Optional unit suffix (e.g. 'students', 'classes')
 * - iconColor: Icon stroke color (defaults to var(--primary))
 * - iconBg: Icon container background color (defaults to var(--primary-light))
 * - size: 'default' (48px container, 24px icon, 1.5rem value for dashboards) or
 *         'compact' (44px container, 22px icon, 1.4rem value for report pages)
 * - style: Style object passed to the outer Card
 * - className: CSS class passed to the outer Card
 */
export const StatCard = ({
  icon: Icon,
  title,
  value,
  unit,
  iconColor = 'var(--primary)',
  iconBg = 'var(--primary-light)',
  size = 'default',
  style = {},
  className = '',
}) => {
  const isCompact = size === 'compact';

  return (
    <Card
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        ...style,
      }}
    >
      {Icon && (
        <div
          style={{
            width: isCompact ? '44px' : '48px',
            height: isCompact ? '44px' : '48px',
            borderRadius: isCompact ? '10px' : '12px',
            backgroundColor: iconBg,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={isCompact ? 22 : 24} />
        </div>
      )}
      <div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {title}
        </div>
        <div
          style={{
            fontSize: isCompact ? '1.4rem' : '1.5rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            marginTop: '0.2rem',
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontSize: isCompact ? '0.8rem' : '0.85rem',
                fontWeight: 400,
                marginLeft: '0.35rem',
              }}
            >
              {unit}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};
