import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CodeShieldLogo from './CodeShieldLogo.jsx';

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
        <CodeShieldLogo size={30} showText={true} textColor="#f8fafc" />
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
