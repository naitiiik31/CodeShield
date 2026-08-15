import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
      <div className="slide-up">
        <div style={{ marginBottom: '24px' }}>
          <svg width="72" height="72" viewBox="0 0 32 32" fill="none" style={{ margin: '0 auto' }}>
            <rect width="32" height="32" rx="8" fill="url(#gradLanding)" />
            <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="gradLanding" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          background: 'linear-gradient(135deg, #f1f5f9, #818cf8)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          lineHeight: 1.2,
        }}>
          CodeGuard
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'var(--cg-text-muted)',
          maxWidth: '650px',
          margin: '0 auto 24px',
        }}>
          Multi-Language Code Similarity & Plagiarism Detection Engine.
          Unified normalized fingerprinting for 6 programming languages.
        </p>

        {/* Supported Languages Badges */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
          {['Python', 'JavaScript', 'Java', 'C++', 'C', 'C#'].map((name) => (
            <span key={name} style={{
              padding: '6px 16px',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '20px',
              color: '#818cf8',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              {name}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '80px' }}>
          {user ? (
            <Link to={user.role === 'professor' ? '/professor' : '/student'} className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
              Go to Dashboard
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                Get Started
              </Link>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
                Sign In
              </Link>
            </>
          )}
          <Link to="/demo" className="btn btn-secondary" style={{ padding: '14px 32px', fontSize: '1rem' }}>
            Try Interactive Demo
          </Link>
        </div>


      </div>
    </div>
  );
}
