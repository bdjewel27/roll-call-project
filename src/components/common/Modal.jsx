import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '540px',
  ariaDescribedBy,
  initialFocusRef,
}) => {
  const titleId = useId();
  const modalRef = useRef(null);
  const previousActiveElementRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const initialFocusRefRef = useRef(initialFocusRef);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    initialFocusRefRef.current = initialFocusRef;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element before opening
    previousActiveElementRef.current = document.activeElement;

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus ONCE when modal opens
    const focusTimeout = setTimeout(() => {
      // If user or browser already focused an input inside the modal, do not steal focus
      if (
        modalRef.current &&
        modalRef.current.contains(document.activeElement) &&
        document.activeElement !== modalRef.current
      ) {
        return;
      }

      if (initialFocusRefRef.current?.current) {
        initialFocusRefRef.current.current.focus();
      } else if (modalRef.current) {
        // Query focusables inside content first (excluding header close button)
        const contentContainer = modalRef.current.querySelector('.modal-content-area');
        const contentFocusables = contentContainer
          ? Array.from(contentContainer.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
              (el) => el.offsetParent !== null
            )
          : [];

        if (contentFocusables.length > 0) {
          contentFocusables[0].focus();
        } else {
          // Fall back to all focusables (e.g. close button) or modal container
          const allFocusables = Array.from(
            modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
          ).filter((el) => el.offsetParent !== null);

          if (allFocusables.length > 0) {
            allFocusables[0].focus();
          } else {
            modalRef.current.focus();
          }
        }
      }
    }, 0);

    // Keyboard handlers: Escape and Tab focus trap
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusables.length === 0) {
          e.preventDefault();
          modalRef.current.focus();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !modalRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !modalRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimeout);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // Restore focus to opener element
      if (
        previousActiveElementRef.current &&
        typeof previousActiveElementRef.current.focus === 'function' &&
        document.contains(previousActiveElementRef.current)
      ) {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? 'Dialog' : undefined}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth,
          backgroundColor: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          outline: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h3
            id={titleId}
            style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              borderRadius: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content-area" style={{ padding: '1.5rem', overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};
