import React, { useId, useRef } from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDanger = true,
}) => {
  const messageId = useId();
  const cancelBtnRef = useRef(null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="440px"
      ariaDescribedBy={messageId}
      initialFocusRef={cancelBtnRef}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <div
            style={{
              padding: '0.6rem',
              borderRadius: '10px',
              backgroundColor: isDanger ? 'var(--status-absent-bg)' : 'var(--status-late-bg)',
              color: isDanger ? 'var(--status-absent-text)' : 'var(--status-late-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <p
              id={messageId}
              style={{ margin: 0, fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}
            >
              {message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{
              backgroundColor: isDanger ? 'var(--status-absent-bg)' : 'var(--primary)',
              color: isDanger ? 'var(--status-absent-text)' : '#ffffff',
              border: isDanger ? '1px solid var(--status-absent-border)' : '1px solid transparent',
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
