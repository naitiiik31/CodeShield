import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CodeShieldLogo from '../components/CodeShieldLogo.jsx';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRedirect = (user) => {
    if (user?.role === 'student') {
      navigate('/student/dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      handleRedirect(user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 64px)',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="slide-up"
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'rgba(30, 41, 59, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: '20px',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.4)',
          padding: '40px 44px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '12px' }}>
            <CodeShieldLogo size={56} showText={false} />
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              margin: '0 0 8px 0',
              lineHeight: 1.2,
            }}
          >
            CodeShield
          </h1>
          <p
            style={{
              color: 'var(--cg-text-muted, #94a3b8)',
              fontSize: '0.95rem',
              fontWeight: 400,
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Sign in to your Faculty or Student Account
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '28px',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.2)' }} />
          <span
            style={{
              color: '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            OR SIGN IN WITH EMAIL
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(148, 163, 184, 0.2)' }} />
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="alert alert-error"
            style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '10px',
              fontSize: '0.9rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label
              htmlFor="email-input"
              className="form-label"
              style={{
                display: 'block',
                fontWeight: 600,
                color: '#e2e8f0',
                fontSize: '0.875rem',
                marginBottom: '8px',
              }}
            >
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@university.edu"
              style={{
                width: '100%',
                height: '50px',
                padding: '0 16px',
                fontSize: '0.95rem',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '10px',
                color: '#f8fafc',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
          </div>

          {/* Password Field */}
          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label
              htmlFor="password-input"
              className="form-label"
              style={{
                display: 'block',
                fontWeight: 600,
                color: '#e2e8f0',
                fontSize: '0.875rem',
                marginBottom: '8px',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  height: '50px',
                  padding: '0 48px 0 16px',
                  fontSize: '0.95rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  color: '#f8fafc',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'color 0.2s',
                }}
              >
                {showPassword ? (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              width: '100%',
              height: '50px',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--cg-primary, #6366f1), var(--cg-primary-dark, #4f46e5))',
              boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer / Register Link */}
        <p
          style={{
            textAlign: 'center',
            marginTop: '28px',
            marginBottom: 0,
            fontSize: '0.9rem',
            color: 'var(--cg-text-muted, #94a3b8)',
          }}
        >
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--cg-primary-light, #818cf8)',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
