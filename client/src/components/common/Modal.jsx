import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from './CloseButton.jsx';

export default function Modal({
  isOpen = true,
  onClose,
  category,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '720px',
}) {
  const modalBodyRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#1e293b',
          border: '1px solid var(--cg-border)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          color: 'var(--cg-text)',
        }}
      >
        {/* MODAL HEADER */}
        {(category || title || subtitle || onClose) && (
          <div
            style={{
              padding: '24px',
              borderBottom: '1px solid var(--cg-border)',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'flex-start',
              background: '#1e293b',
              flexShrink: 0,
              gap: '16px',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              {category && (
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--cg-primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    marginBottom: '4px',
                  }}
                >
                  {category}
                </div>
              )}
              {title && (
                <h2
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--cg-text)',
                    lineHeight: '1.25',
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--cg-text-muted)',
                    margin: '6px 0 0 0',
                    lineHeight: '1.4',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {onClose && <CloseButton onClick={onClose} />}
          </div>
        )}

        {/* MODAL BODY (SCROLLABLE) */}
        <div
          ref={modalBodyRef}
          style={{
            overflowY: 'auto',
            overflowX: 'hidden',
            flex: '1 1 auto',
            minHeight: 0,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {children}
        </div>

        {/* MODAL FOOTER */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--cg-border)',
              display: 'flex',
              justify: 'flex-end',
              alignItems: 'center',
              gap: '12px',
              background: '#1e293b',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
