import React from 'react';

export default function CloseButton({ onClick, ariaLabel = 'Close', style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      style={{
        width: '36px',
        height: '36px',
        minWidth: '36px',
        minHeight: '36px',
        borderRadius: '50%',
        border: '1px solid var(--cg-border)',
        background: 'rgba(255, 255, 255, 0.06)',
        color: 'var(--cg-text-secondary)',
        fontSize: '20px',
        lineHeight: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease-in-out',
        padding: 0,
        outline: 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
        e.currentTarget.style.color = 'var(--cg-text)';
        e.currentTarget.style.borderColor = 'var(--cg-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
        e.currentTarget.style.color = 'var(--cg-text-secondary)';
        e.currentTarget.style.borderColor = 'var(--cg-border)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid var(--cg-primary)';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      ×
    </button>
  );
}
