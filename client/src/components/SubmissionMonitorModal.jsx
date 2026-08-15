import React from 'react';
import Modal from './common/Modal.jsx';

export default function SubmissionMonitorModal({
  assignment,
  submissions = [],
  loading = false,
  onClose,
}) {
  if (!assignment) return null;

  // Group by studentIdentifier to get latest version per student
  const studentLatestMap = new Map();
  submissions.forEach((sub) => {
    if (!studentLatestMap.has(sub.studentIdentifier)) {
      studentLatestMap.set(sub.studentIdentifier, sub);
    }
  });

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const dateFormatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
    return `${dateFormatted} · ${timeFormatted}`;
  };

  const getStatusBadge = (status) => {
    if (status === 'fingerprinted' || status === 'completed') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: 'rgba(16, 185, 129, 0.12)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.25)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
          Fingerprinted
        </span>
      );
    }
    if (status === 'processing' || status === 'queued') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '0.8rem',
            fontWeight: 600,
            background: 'rgba(59, 130, 246, 0.12)',
            color: '#3b82f6',
            border: '1px solid rgba(59, 130, 246, 0.25)',
          }}
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
          Processing
        </span>
      );
    }
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '0.8rem',
          fontWeight: 600,
          background: 'rgba(239, 68, 68, 0.12)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.25)',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
        {status || 'Failed'}
      </span>
    );
  };

  const footer = (
    <button onClick={onClose} className="btn btn-secondary">
      Close
    </button>
  );

  return (
    <Modal
      isOpen={Boolean(assignment)}
      onClose={onClose}
      category="Submissions Progress & Monitor"
      title={assignment.title}
      subtitle="Track student submissions and analysis readiness"
      maxWidth="920px"
      footer={footer}
    >
      {/* SUMMARY METRIC CARDS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--cg-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cg-text)' }}>
            {studentLatestMap.size}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', fontWeight: 500 }}>
            Students Submitted
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--cg-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--cg-primary)' }}>
            {submissions.length}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', fontWeight: 500 }}>
            Total Versions
          </div>
        </div>

        <div
          style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid var(--cg-border)',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: studentLatestMap.size >= 2 ? '#10b981' : 'var(--cg-warning)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              height: '36px',
            }}
          >
            {studentLatestMap.size >= 2 ? '✓ Ready for Analysis' : 'Awaiting Submissions'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', fontWeight: 500 }}>
            Analysis Status
          </div>
        </div>
      </div>

      {/* STUDENT SUBMISSIONS TABLE */}
      <div>
        <h3
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            marginBottom: '12px',
            color: 'var(--cg-text)',
          }}
        >
          Students ({submissions.length})
        </h3>

        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '36px',
              color: 'var(--cg-text-muted)',
              fontSize: '0.9rem',
            }}
          >
            Loading student submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px dashed var(--cg-border)',
              borderRadius: '12px',
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📄</div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--cg-text)' }}>
              No submissions yet
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', margin: 0 }}>
              Students have not submitted this assignment yet. Share Assignment Code{' '}
              <code
                style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--cg-primary)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                }}
              >
                {assignment.assignmentCode || 'BST-7K42'}
              </code>{' '}
              with your class.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--cg-border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.875rem',
                  tableLayout: 'fixed',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderBottom: '1px solid var(--cg-border)',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '14px 16px', width: '28%', fontWeight: 700, color: 'var(--cg-text-secondary)' }}>
                      Student
                    </th>
                    <th style={{ padding: '14px 16px', width: '15%', fontWeight: 700, color: 'var(--cg-text-secondary)' }}>
                      Version
                    </th>
                    <th style={{ padding: '14px 16px', width: '15%', fontWeight: 700, color: 'var(--cg-text-secondary)' }}>
                      Language
                    </th>
                    <th style={{ padding: '14px 16px', width: '24%', fontWeight: 700, color: 'var(--cg-text-secondary)' }}>
                      Submitted
                    </th>
                    <th style={{ padding: '14px 16px', width: '18%', fontWeight: 700, color: 'var(--cg-text-secondary)' }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub, idx) => {
                    const latestForStudent = studentLatestMap.get(sub.studentIdentifier);
                    const isLatest = latestForStudent && latestForStudent._id === sub._id;

                    return (
                      <tr
                        key={sub._id || idx}
                        style={{
                          borderBottom: idx < submissions.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                          background: isLatest ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {/* Student Cell: Name + ID */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 600, color: 'var(--cg-text)', fontSize: '0.9rem' }}>
                            {sub.studentName || sub.studentIdentifier}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '2px' }}>
                            ID: {sub.studentIdentifier}
                          </div>
                        </td>

                        {/* Version Badge */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                padding: '3px 8px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                color: 'var(--cg-primary)',
                                borderRadius: '6px',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              V{sub.version || 1}
                            </span>
                            {isLatest && (
                              <span
                                style={{
                                  padding: '2px 6px',
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  letterSpacing: '0.3px',
                                }}
                              >
                                LATEST
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Language */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              background: 'rgba(255, 255, 255, 0.06)',
                              color: 'var(--cg-text-secondary)',
                              borderRadius: '6px',
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              textTransform: 'uppercase',
                            }}
                          >
                            {sub.language || 'python'}
                          </span>
                        </td>

                        {/* Submission Time */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: 'var(--cg-text-muted)', fontSize: '0.825rem' }}>
                          {formatDate(sub.submittedAt)}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          {getStatusBadge(sub.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
