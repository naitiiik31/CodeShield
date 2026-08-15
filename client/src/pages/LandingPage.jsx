import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CodeShieldLogo from '../components/CodeShieldLogo.jsx';

export default function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '60px' }}>
      <div className="slide-up">
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
          <CodeShieldLogo
            size={72}
            showText={true}
            showSubtitle={true}
            textColor="#ffffff"
            subtitleColor="#94a3b8"
          />
        </div>

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
