import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters & Sorting State
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'pending', 'submitted', 'dueSoon'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' = deadline ascending, 'desc' = deadline descending

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/student/dashboard');
      setDashboardData(res.data);
    } catch (err) {
      console.error('Failed to fetch student dashboard:', err);
      setError(err.response?.data?.error || 'Failed to load student dashboard');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dStr) => {
    if (!dStr) return '';
    return new Date(dStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeadlineBadgeInfo = (deadlineStr, isClosed) => {
    if (isClosed || new Date() >= new Date(deadlineStr)) {
      return { text: 'Closed', color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)' };
    }

    const diffMs = new Date(deadlineStr).getTime() - Date.now();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays >= 1) {
      return {
        text: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
        color: '#10b981',
        background: 'rgba(16, 185, 129, 0.15)',
      };
    } else if (diffHours >= 2) {
      return {
        text: `Due in ${diffHours} hours`,
        color: '#eab308',
        background: 'rgba(234, 179, 8, 0.15)',
      };
    } else if (diffHours >= 1) {
      return {
        text: `Due in 1 hour`,
        color: '#f97316',
        background: 'rgba(249, 115, 22, 0.15)',
      };
    } else {
      return {
        text: `Due in ${Math.max(1, diffMins)} minutes`,
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.15)',
      };
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 32px' }}>
        <div className="status-badge status-processing">Loading Student Dashboard...</div>
      </div>
    );
  }

  const studentUser = dashboardData?.user || user;
  const studentName = studentUser?.name || 'Student';
  const academicProfile = studentUser?.academicProfile || { department: 'CSE', division: 'D3', batch: '2023' };
  const groupDisplay = `${academicProfile.department || 'CSE'} / ${academicProfile.division || 'D3'} / ${academicProfile.batch || '2023'}`;
  const allAssignments = dashboardData?.assignments || [];
  const stats = dashboardData?.stats || {
    totalAssignments: allAssignments.length,
    submittedCount: allAssignments.filter((a) => a.latestSubmission !== null).length,
    pendingCount: allAssignments.filter((a) => a.latestSubmission === null && !a.isClosed).length,
    dueSoonCount: allAssignments.filter((a) => {
      const diffHours = (new Date(a.deadline).getTime() - Date.now()) / (3600 * 1000);
      return diffHours > 0 && diffHours <= 48 && a.latestSubmission === null;
    }).length,
  };

  // Filter Logic
  let filteredAssignments = allAssignments.filter((ass) => {
    if (activeFilter === 'pending') {
      return ass.latestSubmission === null && !ass.isClosed;
    }
    if (activeFilter === 'submitted') {
      return ass.latestSubmission !== null;
    }
    if (activeFilter === 'dueSoon') {
      const diffHours = (new Date(ass.deadline).getTime() - Date.now()) / (3600 * 1000);
      return diffHours > 0 && diffHours <= 48 && ass.latestSubmission === null;
    }
    return true;
  });

  // Sort Logic
  filteredAssignments.sort((a, b) => {
    const timeA = new Date(a.deadline).getTime();
    const timeB = new Date(b.deadline).getTime();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '32px 32px' }} className="fade-in">
      {/* Header Card */}
      <div
        className="glass-card"
        style={{
          marginBottom: '28px',
          padding: '24px 32px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
          border: '1px solid var(--cg-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="page-title" style={{ fontSize: '1.75rem', margin: '0 0 6px 0', fontWeight: 700 }}>
              Welcome back, {studentName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem' }}>
                Student ID: <strong style={{ color: 'var(--cg-text)' }}>{studentUser?.studentId || 'N/A'}</strong>
              </span>
              <span style={{ color: 'var(--cg-border)' }}>|</span>
              <span
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--cg-primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                }}
              >
                {groupDisplay}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>Available Assignments</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cg-accent)' }}>
              {stats.pendingCount} Assignment{stats.pendingCount !== 1 ? 's' : ''} Available
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: '24px' }}>{error}</div>}

      {/* Quick Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div className="stat-card" style={{ padding: '20px' }}>
          <div className="stat-value">{stats.totalAssignments}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.submittedCount}</div>
          <div className="stat-label">Submitted</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <div className="stat-value" style={{ color: '#eab308' }}>{stats.pendingCount}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card" style={{ padding: '20px' }}>
          <div className="stat-value" style={{ color: '#f97316' }}>{stats.dueSoonCount}</div>
          <div className="stat-label">Due Soon (48h)</div>
        </div>
      </div>

      {/* Section Header & Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>My Assignments</h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', border: '1px solid var(--cg-border)' }}>
            <button
              onClick={() => setActiveFilter('all')}
              className={`btn btn-sm ${activeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            >
              All ({allAssignments.length})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`btn btn-sm ${activeFilter === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            >
              Pending ({stats.pendingCount})
            </button>
            <button
              onClick={() => setActiveFilter('submitted')}
              className={`btn btn-sm ${activeFilter === 'submitted' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            >
              Submitted ({stats.submittedCount})
            </button>
            <button
              onClick={() => setActiveFilter('dueSoon')}
              className={`btn btn-sm ${activeFilter === 'dueSoon' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            >
              Due Soon ({stats.dueSoonCount})
            </button>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>Sort:</span>
            <select
              className="form-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '8px' }}
            >
              <option value="asc">Deadline (Earliest First)</option>
              <option value="desc">Deadline (Latest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignment Card Grid (3 per row on desktop) */}
      {filteredAssignments.length === 0 ? (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--cg-text)' }}>
            No assignments yet
          </h3>
          <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
            There are currently no assignments available for <strong>{groupDisplay}</strong> matching your active filter.
          </p>
          <span style={{ fontSize: '0.85rem', color: 'var(--cg-accent)' }}>
            Assignments created by your Faculty for {groupDisplay} will automatically appear here.
          </span>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {filteredAssignments.map((ass) => {
            const badge = getDeadlineBadgeInfo(ass.deadline, ass.isClosed);
            const isSubmitted = ass.latestSubmission !== null;

            return (
              <div
                key={ass._id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid var(--cg-border)',
                  background: 'rgba(30, 41, 59, 0.5)',
                  transition: 'transform 200ms ease, border-color 200ms ease',
                }}
              >
                <div>
                  {/* Top Bar: Language & Deadline Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--cg-primary)',
                        background: 'rgba(99, 102, 241, 0.12)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {ass.languageAllowed}
                    </span>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: badge.color,
                        background: badge.background,
                        padding: '3px 10px',
                        borderRadius: '12px',
                      }}
                    >
                      {badge.text}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--cg-text)', lineHeight: 1.3 }}>
                    {ass.title}
                  </h3>

                  {/* Academic Group */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginBottom: '16px' }}>
                    {ass.targetGroup?.department || 'CSE'} / {ass.targetGroup?.division || 'D3'} / {ass.targetGroup?.batch || '2023'}
                  </div>

                  {/* Deadline Date */}
                  <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-secondary)', marginBottom: '16px' }}>
                    <span style={{ color: 'var(--cg-text-muted)' }}>Due: </span>
                    <strong>{formatDate(ass.deadline)}</strong>
                  </div>
                </div>

                {/* Bottom Bar: Submission Status & Action Button */}
                <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>Status:</span>
                    {isSubmitted ? (
                      <span className="status-badge status-completed" style={{ fontSize: '0.8rem' }}>
                        Submitted (v{ass.latestSubmission.version})
                      </span>
                    ) : (
                      <span className="status-badge status-processing" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', fontSize: '0.8rem' }}>
                        Pending
                      </span>
                    )}
                  </div>

                  <Link
                    to={`/student/assignments/${ass._id}`}
                    className={`btn ${isSubmitted ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%', justifyContent: 'center', fontWeight: 600, padding: '10px' }}
                  >
                    {isSubmitted ? 'View / Resubmit' : 'Open Assignment'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
