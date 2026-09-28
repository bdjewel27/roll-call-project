import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({
  showToast: () => {},
});

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '420px',
          width: 'calc(100% - 48px)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => {
          let bg = 'var(--bg-card)';
          let border = 'var(--border-color)';
          let text = 'var(--text-primary)';
          let Icon = Info;
          let iconColor = 'var(--primary)';

          if (toast.type === 'success') {
            border = 'var(--status-present-border)';
            Icon = CheckCircle2;
            iconColor = 'var(--status-present)';
          } else if (toast.type === 'error') {
            border = 'var(--status-absent-border)';
            Icon = AlertCircle;
            iconColor = 'var(--status-absent)';
          }

          const isAlert = toast.type === 'error';

          return (
            <div
              key={toast.id}
              role={isAlert ? 'alert' : 'status'}
              aria-live={isAlert ? 'assertive' : 'polite'}
              aria-atomic="true"
              className="animate-fade-in"
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: bg,
                color: text,
                borderRadius: '10px',
                border: `1px solid ${border}`,
                boxShadow: 'var(--shadow-lg)',
                fontSize: '0.875rem',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Icon size={18} color={iconColor} style={{ flexShrink: 0 }} />
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useToast = () => useContext(ToastContext);
