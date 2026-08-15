import React from 'react';

export default function CloseButton({ onClick, ariaLabel = 'Close modal', style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: '32px',
        height: '32px',
        minWidth: '32px',
        minHeight: '32px',
        borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        background: 'rgba(255, 255, 255, 0.08)',
        color: 'var(--cg-text-muted, #94a3b8)',
        fontSize: '18px',
        lineHeight: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        padding: 0,
        outline: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
        e.currentTarget.style.color = '#ffffff';
        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.color = 'var(--cg-text-muted, #94a3b8)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--cg-primary, #6366f1)';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      ✕
    </button>
  );
}
