import React from 'react';

/**
 * CodeShieldLogo Component
 * Renders the official CodeShield logo: A dark blue shield with white code brackets (</>)
 * and a vibrant green checkmark (✓).
 */
export default function CodeShieldLogo({
  size = 32,
  showText = true,
  showSubtitle = false,
  textColor = 'currentColor',
  subtitleColor = 'var(--cg-text-muted, #64748b)',
  className = '',
  style = {}
}) {
  return (
    <div
      className={`codeshield-logo ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size > 40 ? '16px' : '10px',
        ...style
      }}
    >
      <svg
        width={size}
        height={Math.round(size * 1.1)}
        viewBox="0 0 100 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e589f" />
            <stop offset="100%" stopColor="#0b3c73" />
          </linearGradient>
          <filter id="shieldShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Shield Outer Path */}
        <path
          d="M 50,6 C 66,14 82,18 85,22 C 87,52 82,78 50,102 C 18,78 13,52 15,22 C 18,18 34,14 50,6 Z"
          fill="url(#shieldGrad)"
        />

        {/* Code Brackets: < / > */}
        <g stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
          {/* < */}
          <path d="M 33 30 L 23 37 L 33 44" />
          {/* / */}
          <path d="M 45 47 L 55 27" />
          {/* > */}
          <path d="M 67 30 L 77 37 L 67 44" />
        </g>

        {/* Green Checkmark: ✓ */}
        <path
          d="M 30 65 L 44 79 L 72 51"
          stroke="#2dd4bf"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <span
            style={{
              fontSize: size > 40 ? '2.2rem' : '1.25rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: textColor,
              lineHeight: 1.1,
            }}
          >
            CodeShield
          </span>
          {showSubtitle && (
            <span
              style={{
                fontSize: size > 40 ? '0.95rem' : '0.75rem',
                color: subtitleColor,
                fontWeight: 500,
                marginTop: '4px',
              }}
            >
              Code similarity and plagiarism detection
            </span>
          )}
        </div>
      )}
    </div>
  );
}
