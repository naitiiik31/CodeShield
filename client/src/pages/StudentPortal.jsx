import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';

export default function StudentPortal() {
  const { code: paramCode } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [assignmentCode, setAssignmentCode] = useState(paramCode || searchParams.get('code') || '');
  const [studentId, setStudentId] = useState(localStorage.getItem('codeguard_student_id') || '');
  const [studentName, setStudentName] = useState(localStorage.getItem('codeguard_student_name') || '');

  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [assignment, setAssignment] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [file, setFile] = useState(null);
  const [codeContent, setCodeContent] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  // Auto-fill code if present in route params
  useEffect(() => {
    if (paramCode) {
      setAssignmentCode(paramCode.toUpperCase());
    }
  }, [paramCode]);

  // Auto-join if all 3 fields exist
  useEffect(() => {
    if (assignmentCode && studentId && !joined) {
      handleJoinAssignment();
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!assignment?.deadline) return;

    const calculateTimeLeft = () => {
      const diff = new Date(assignment.deadline) - new Date();
      if (diff <= 0) {
        setTimeRemaining('Deadline Passed');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setTimeRemaining(`${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''} remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours} hour${hours > 1 ? 's' : ''} ${minutes} min${minutes > 1 ? 's' : ''} remaining`);
      } else {
        setTimeRemaining(`${minutes} min${minutes > 1 ? 's' : ''} ${seconds} sec remaining`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [assignment?.deadline]);

  const handleJoinAssignment = async (e) => {
    if (e) e.preventDefault();
    if (!assignmentCode.trim() || !studentId.trim()) {
      setError('Please enter Student ID and Assignment Code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const codeUpper = assignmentCode.trim().toUpperCase();
      const sId = studentId.trim();
      const sName = studentName.trim() || sId;

      localStorage.setItem('codeguard_student_id', sId);
      localStorage.setItem('codeguard_student_name', sName);

      const res = await api.get(`/student/status?assignmentCode=${codeUpper}&studentIdentifier=${encodeURIComponent(sId)}`);
      setAssignment(res.data.assignment);
      setStatusData(res.data);
      setJoined(true);
    } catch (err) {
      console.error('Join assignment error:', err);
      setError(err.response?.data?.error || 'Assignment not found. Check assignment code.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowed = ['.py', '.js', '.jsx', '.java', '.cpp', '.c', '.cs'];
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Invalid file type (${ext}). Supported formats: ${allowed.join(', ')}`);
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
  };

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    if (!file && !codeContent.trim()) {
      setError('Please choose a file or enter code to submit.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append('assignmentCode', assignment.assignmentCode);
      formData.append('studentIdentifier', studentId.trim());
      formData.append('studentName', studentName.trim() || studentId.trim());

      if (file) {
        formData.append('file', file);
      } else {
        formData.append('code', codeContent);
        formData.append('fileName', `submission.${assignment.languageAllowed === 'javascript' ? 'js' : 'py'}`);
      }

      const res = await api.post('/student/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg(`✓ Successfully submitted! Version ${res.data.submission?.version}`);
      setFile(null);
      setCodeContent('');

      // Refresh status
      const statusRes = await api.get(
        `/student/status?assignmentCode=${assignment.assignmentCode}&studentIdentifier=${encodeURIComponent(studentId.trim())}`
      );
      setStatusData(statusRes.data);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.response?.data?.error || 'Failed to submit assignment.');
    } finally {
      setLoading(false);
    }
  };

  const formatDeadline = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isClosed = assignment?.isClosed || (assignment?.deadline && new Date() >= new Date(assignment.deadline));

  if (!joined) {
    return (
      <div className="container py-12" style={{ maxWidth: '480px' }}>
        <div className="card shadow-lg" style={{ padding: '2rem', borderRadius: '16px' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎓</div>
            <h2 className="gradient-text" style={{ fontSize: '1.75rem', margin: 0 }}>
              Student Submission Portal
            </h2>
            <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Join assignment to upload your code
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleJoinAssignment}>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Assignment Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. BST-7K42 or ARRAY-2026"
                value={assignmentCode}
                onChange={(e) => setAssignmentCode(e.target.value.toUpperCase())}
                required
                style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Student ID / Roll Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Average1 or STU-101"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Student Full Name (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Average1"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
              disabled={loading}
            >
              {loading ? 'Joining Assignment...' : 'Join Assignment →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8" style={{ maxWidth: '800px' }}>
      {/* Top Bar Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={() => {
            setJoined(false);
            setAssignment(null);
            setStatusData(null);
          }}
          className="btn btn-sm btn-secondary"
        >
          ← Change Assignment / Student
        </button>
        <span style={{ color: 'var(--cg-text-muted)', fontSize: '0.85rem' }}>
          CodeGuard Student Portal
        </span>
      </div>

      {/* Assignment Header Card */}
      <div className="card shadow-md" style={{ borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span
              className="badge"
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--cg-primary)',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
              }}
            >
              Code: {assignment.assignmentCode}
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', marginBottom: '0.25rem' }}>
              {assignment.title}
            </h1>
            <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Student: <strong style={{ color: 'var(--cg-text)' }}>{studentName || studentId}</strong> ({studentId})
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>Language Allowed:</div>
            <span className="status-badge status-completed" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
              {assignment.languageAllowed.toUpperCase()}
            </span>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--cg-border)', margin: '1.25rem 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Deadline
            </div>
            <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.2rem' }}>
              📅 {formatDeadline(assignment.deadline)}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Status / Time Remaining
            </div>
            {isClosed ? (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '0.25rem',
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                🔒 Submission Closed
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-block',
                  marginTop: '0.25rem',
                  padding: '0.35rem 0.75rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                ⏳ {timeRemaining}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Description Card */}
      {assignment.description && (
        <div className="card shadow-sm" style={{ borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Assignment Description</h3>
          <p style={{ color: 'var(--cg-text-secondary)', lineHeight: 1.6, margin: 0, whitespace: 'pre-wrap' }}>
            {assignment.description}
          </p>
        </div>
      )}

      {/* Upload & Submission Form Card */}
      <div className="card shadow-md" style={{ borderRadius: '16px', padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📤</span> {statusData?.hasSubmitted ? 'Replace Submission (Resubmit)' : 'Submit Assignment'}
        </h3>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
            ⚠️ {error}
          </div>
        )}

        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            {successMsg}
          </div>
        )}

        {isClosed ? (
          <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
            <h4 style={{ color: '#ef4444', margin: 0, fontWeight: 700 }}>Submission Deadline Passed</h4>
            <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem', marginBottom: 0 }}>
              This assignment is closed. New submissions and replacements are no longer accepted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitCode}>
            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Choose Source File</label>
              <input
                type="file"
                className="form-control"
                accept=".py,.js,.jsx,.java,.cpp,.c,.cs"
                onChange={handleFileChange}
                disabled={loading}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', marginTop: '0.4rem' }}>
                Supported extensions: <code>.py</code>, <code>.js</code>, <code>.java</code>, <code>.cpp</code>, <code>.c</code>, <code>.cs</code>
              </div>
            </div>

            <div style={{ textAlign: 'center', margin: '0.75rem 0', color: 'var(--cg-text-muted)', fontSize: '0.85rem' }}>
              — OR PASTE CODE —
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Paste Source Code</label>
              <textarea
                className="form-control"
                rows="8"
                placeholder="// Paste your code solution here..."
                value={codeContent}
                onChange={(e) => setCodeContent(e.target.value)}
                disabled={loading || file !== null}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
              ></textarea>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', fontWeight: 700 }}
              disabled={loading || (!file && !codeContent.trim())}
            >
              {loading ? 'Uploading & Queuing...' : statusData?.hasSubmitted ? 'Replace Submission' : 'Submit Assignment'}
            </button>
          </form>
        )}
      </div>

      {/* Submission Status & Personal Version History Card */}
      <div className="card shadow-md" style={{ borderRadius: '16px', padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📋</span> My Submission Status
        </h3>

        {!statusData?.hasSubmitted ? (
          <div style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--cg-bg-subtle)', borderRadius: '12px', border: '1px dashed var(--cg-border)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--cg-text-muted)' }}>⏳</div>
            <strong style={{ fontSize: '1rem', color: 'var(--cg-text-muted)' }}>Not Submitted Yet</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', margin: '0.25rem 0 0 0' }}>
              Upload your code file above before the deadline.
            </p>
          </div>
        ) : (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between',
                padding: '1rem 1.25rem',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✓</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                    Submitted (Version {statusData.latestSubmission?.version})
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>
                    File: {statusData.latestSubmission?.fileName} • {formatDeadline(statusData.latestSubmission?.submittedAt)}
                  </div>
                </div>
              </div>

              <span className="status-badge status-completed" style={{ textTransform: 'capitalize' }}>
                {statusData.latestSubmission?.status || 'Completed'}
              </span>
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--cg-text-secondary)' }}>
              Version History
            </h4>

            <div className="table-responsive">
              <table className="table" style={{ fontSize: '0.9rem' }}>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>File Name</th>
                    <th>Submitted Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {statusData.history?.map((sub) => (
                    <tr key={sub._id}>
                      <td>
                        <strong>Version {sub.version}</strong>
                        {sub.isLatest && (
                          <span
                            className="badge"
                            style={{
                              marginLeft: '0.5rem',
                              background: 'var(--cg-primary)',
                              color: '#fff',
                              fontSize: '0.7rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                            }}
                          >
                            LATEST
                          </span>
                        )}
                      </td>
                      <td><code>{sub.fileName}</code></td>
                      <td>{formatDeadline(sub.submittedAt)}</td>
                      <td>
                        <span className={`status-badge status-${sub.status === 'fingerprinted' ? 'completed' : 'processing'}`}>
                          {sub.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
