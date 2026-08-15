import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="status-badge status-processing">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isFacultyRole =
      (allowedRoles.includes('faculty') || allowedRoles.includes('professor')) &&
      (user.role === 'faculty' || user.role === 'professor');
    const isAllowed = allowedRoles.includes(user.role) || isFacultyRole;

    if (!isAllowed) {
      if (user.role === 'student') {
        return <Navigate to="/student/dashboard" replace />;
      } else {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <Outlet />;
}
