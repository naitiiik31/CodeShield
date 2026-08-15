import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isStudent = user?.role === 'student';

  return (
    <nav className="navbar">
      <Link to={user ? (isStudent ? '/student/dashboard' : '/dashboard') : '/'} className="navbar-brand" style={{ textDecoration: 'none' }}>
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="url(#grad)" />
          <path d="M10 16L14 20L22 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="32" y2="32">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </svg>
        <span>CodeGuard</span>
      </Link>

      <div className="navbar-links">
        {user ? (
          <>
            {isStudent ? (
              <Link to="/student/dashboard" className="navbar-link">
                My Dashboard
              </Link>
            ) : (
              <Link to="/dashboard" className="navbar-link">
                Faculty Dashboard
              </Link>
            )}
            <Link to="/demo" className="navbar-link">
              Algorithm Demo
            </Link>
            <span style={{ color: 'var(--cg-text-muted)', fontSize: '0.8rem' }}>
              {user.name} ({isStudent ? `Student ID: ${user.studentId || 'N/A'}` : 'Faculty'})
            </span>
            <button onClick={handleLogout} className="btn btn-sm btn-secondary">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/submit" className="navbar-link">Student Portal</Link>
            <Link to="/demo" className="navbar-link">Algorithm Demo</Link>
            <Link to="/login" className="navbar-link">Sign In</Link>
            <Link to="/register" className="btn btn-sm btn-primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
