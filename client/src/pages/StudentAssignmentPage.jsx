import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const EXTENSION_MAP = {
  python: ['.py'],
  javascript: ['.js', '.jsx'],
  java: ['.java'],
  cpp: ['.cpp', '.cc', '.cxx'],
  c: ['.c'],
  csharp: ['.cs'],
  auto: ['.py', '.js', '.jsx', '.java', '.cpp', '.c', '.cs'],
};

export default function StudentAssignmentPage() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [assignment, setAssignment] = useState(null);
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tab State: 'upload' vs 'paste'
  const [submissionTab, setSubmissionTab] = useState('upload');

  // Upload Form State
  const [file, setFile] = useState(null);
  const [codeContent, setCodeContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    fetchAssignmentAndStatus();
    const interval = setInterval(updateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [assignmentId]);

  const fetchAssignmentAndStatus = async () => {
    try {
      const [assRes, statusRes] = await Promise.all([
        api.get(`/student/assignments/${assignmentId}`),
        api.get(`/student/assignments/${assignmentId}/status`),
      ]);
      setAssignment(assRes.data);
      setStatusData(statusRes.data);
      updateTimeRemaining(assRes.data.deadline);
    } catch (err) {
      console.error('Failed to fetch student assignment page:', err);
      setError(err.response?.data?.error || 'Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = (dl) => {
    const targetDeadline = dl || assignment?.deadline;
    if (!targetDeadline) return;

    const diff = new Date(targetDeadline).getTime() - Date.now();
    if (diff <= 0) {
      setTimeRemaining('Submission Closed');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      setTimeRemaining(`${days} day${days > 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''} remaining`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''} ${mins} minute${mins !== 1 ? 's' : ''} remaining`);
    } else {
      setTimeRemaining(`${mins} min ${secs} sec remaining`);
    }
  };

  const validateFileExtension = (selectedFile) => {
    if (!selectedFile) return true;
    const ext = '.' + selectedFile.name.split('.').pop().toLowerCase();
    const langKey = (assignment?.languageAllowed || 'python').toLowerCase();
    const validExts = EXTENSION_MAP[langKey] || EXTENSION_MAP.auto;

    if (!validExts.includes(ext)) {
      setError(`Invalid file extension '${ext}'. Allowed extension for ${assignment.languageAllowed.toUpperCase()} is ${validExts.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (selectedFile) => {
    setError('');
    setSuccessMsg('');
    if (!selectedFile) return;

    if (validateFileExtension(selectedFile)) {
      setFile(selectedFile);
    } else {
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (submissionTab === 'upload' && !file) {
      setError('Please select a valid source code file to upload.');
      return;
    }

    if (submissionTab === 'paste' && !codeContent.trim()) {
      setError('Please paste your source code before submitting.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      if (submissionTab === 'upload' && file) {
        formData.append('file', file);
      } else {
        formData.append('code', codeContent);
        formData.append(
          'fileName',
          `solution${assignment.languageAllowed === 'javascript' ? '.js' : '.py'}`
        );
      }

      const res = await api.post(`/student/assignments/${assignmentId}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg(`Assignment Submitted Successfully (Version ${res.data.submission?.version})`);
      setFile(null);
      setCodeContent('');

      // Refresh status data
      const statusRes = await api.get(`/student/assignments/${assignmentId}/status`);
      setStatusData(statusRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 32px' }}>
        <div className="status-badge status-processing">Loading assignment details...</div>
      </div>
    );
  }

  if (error && !assignment) {
    return (
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 32px' }}>
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>
        <Link to="/student/dashboard" className="btn btn-secondary">
          Back to My Assignments
        </Link>
      </div>
    );
  }

  const isClosed = assignment?.isClosed || (assignment?.deadline && new Date() >= new Date(assignment.deadline));
  const groupDisplay = `${assignment.targetGroup?.department || 'CSE'} / ${assignment.targetGroup?.division || 'D3'} / ${assignment.targetGroup?.batch || '2023'}`;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 32px' }} className="fade-in">
      {/* Top Back Link */}
      <div style={{ marginBottom: '20px' }}>
        <Link to="/student/dashboard" className="btn btn-sm btn-secondary" style={{ textDecoration: 'none' }}>
          Back to My Assignments
        </Link>
      </div>

      {/* Assignment Hero Card */}
      <div
        className="glass-card"
        style={{
          marginBottom: '24px',
          padding: '24px 32px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.95))',
          border: '1px solid var(--cg-border)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
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
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--cg-text)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  textTransform: 'uppercase',
                }}
              >
                {assignment.languageAllowed}
              </span>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--cg-text)' }}>
              {assignment.title}
            </h1>
            <div style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem' }}>
              Student: <strong style={{ color: 'var(--cg-text)' }}>{user?.name}</strong> • Student ID: <code>{user?.studentId || 'N/A'}</code>
            </div>
          </div>
        </div>
      </div>

      {/* Deadline Card */}
      <div
        className="glass-card"
        style={{
          marginBottom: '28px',
          padding: '20px 24px',
          borderRadius: '14px',
          border: '1px solid var(--cg-border)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Submission Deadline
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px', color: 'var(--cg-text)' }}>
            {formatDate(assignment.deadline)}
          </div>
        </div>

        <div>
          {isClosed ? (
            <span
              style={{
                padding: '6px 16px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              Closed
            </span>
          ) : (
            <span
              style={{
                padding: '6px 16px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                borderRadius: '20px',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {timeRemaining}
            </span>
          )}
        </div>
      </div>

      {/* Instructions & Submission Section (Desktop Grid) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Instructions Card */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '16px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '12px', color: 'var(--cg-text)' }}>
            Assignment Instructions
          </h3>

          <div style={{ color: 'var(--cg-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, whitespace: 'pre-wrap', marginBottom: '20px' }}>
            {assignment.description || 'No detailed description provided for this assignment.'}
          </div>

          <div style={{ borderTop: '1px solid var(--cg-border)', paddingTop: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginBottom: '6px' }}>
              Allowed Submission Language:
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
                color: 'var(--cg-primary)',
                textTransform: 'uppercase',
              }}
            >
              {assignment.languageAllowed}
            </span>
          </div>
        </div>

        {/* Submission Control Card */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', color: 'var(--cg-text)' }}>
            {statusData?.hasSubmitted ? 'Replace Submission (Resubmit)' : 'Submit Assignment'}
          </h3>

          {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}
          {successMsg && <div className="alert alert-success" style={{ marginBottom: '16px' }}>{successMsg}</div>}

          {isClosed ? (
            <div
              style={{
                padding: '24px',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                textAlign: 'center',
              }}
            >
              <h4 style={{ color: '#ef4444', margin: '0 0 4px 0', fontWeight: 700 }}>Submission Deadline Passed</h4>
              <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.85rem', margin: 0 }}>
                The deadline for this assignment has passed. New submissions and replacements are closed.
              </p>
            </div>
          ) : (
            <div>
              {/* Tab Selector */}
              <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', marginBottom: '20px', border: '1px solid var(--cg-border)' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${submissionTab === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setSubmissionTab('upload')}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${submissionTab === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setSubmissionTab('paste')}
                >
                  Paste Code
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {submissionTab === 'upload' ? (
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    {/* Drag and Drop Dropzone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      style={{
                        border: `2px dashed ${dragOver ? 'var(--cg-primary)' : 'var(--cg-border)'}`,
                        borderRadius: '12px',
                        padding: '32px 16px',
                        textAlign: 'center',
                        background: dragOver ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.3)',
                        transition: 'all 200ms ease',
                        cursor: 'pointer',
                      }}
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                    >
                      <input
                        id="file-upload-input"
                        type="file"
                        style={{ display: 'none' }}
                        accept={EXTENSION_MAP[assignment.languageAllowed?.toLowerCase()]?.join(',') || '.py,.js,.java,.cpp,.c,.cs'}
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />

                      {file ? (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#10b981', marginBottom: '4px' }}>
                            {file.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', marginBottom: '12px' }}>
                            Size: {formatFileSize(file.size)}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                          >
                            Remove File
                          </button>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--cg-text)', marginBottom: '4px' }}>
                            Drag and drop your source file or click to browse
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)' }}>
                            Supported: <code>{(EXTENSION_MAP[assignment.languageAllowed?.toLowerCase()] || ['.py']).join(', ')}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: '20px' }}>
                    <label className="form-label">Paste Source Code Solution</label>
                    <textarea
                      className="form-textarea"
                      rows={10}
                      style={{ fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: 1.5 }}
                      placeholder="// Paste your complete source code solution here..."
                      value={codeContent}
                      onChange={(e) => setCodeContent(e.target.value)}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', fontWeight: 700, padding: '12px' }}
                  disabled={submitting || (submissionTab === 'upload' && !file) || (submissionTab === 'paste' && !codeContent.trim())}
                >
                  {submitting ? 'Submitting...' : statusData?.hasSubmitted ? 'Replace Submission (Resubmit)' : 'Submit Assignment'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Submission Status & Version History Section */}
      <div className="glass-card" style={{ padding: '28px', borderRadius: '16px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', color: 'var(--cg-text)' }}>
          My Submission Status
        </h3>

        {!statusData?.hasSubmitted ? (
          <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '12px', border: '1px dashed var(--cg-border)' }}>
            <strong style={{ fontSize: '1rem', color: 'var(--cg-text-muted)' }}>Not Submitted Yet</strong>
            <p style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', margin: '4px 0 0 0' }}>
              Upload your solution file or paste your code above before the deadline.
            </p>
          </div>
        ) : (
          <div>
            {/* Status Summary Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'rgba(16, 185, 129, 0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.05rem' }}>
                  Submitted (Version {statusData.latestSubmission?.version})
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginTop: '2px' }}>
                  File: <code>{statusData.latestSubmission?.fileName}</code> • Submitted: {formatDate(statusData.latestSubmission?.submittedAt)}
                </div>
              </div>

              <span className="status-badge status-completed" style={{ textTransform: 'capitalize' }}>
                {statusData.latestSubmission?.status || 'Fingerprinted'}
              </span>
            </div>

            {/* Version History Timeline Cards */}
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', color: 'var(--cg-text-secondary)' }}>
              Submission History ({statusData.history?.length || 0} Version{(statusData.history?.length || 0) !== 1 ? 's' : ''})
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {statusData.history?.map((sub) => (
                <div
                  key={sub._id}
                  style={{
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center',
                    padding: '14px 18px',
                    background: sub.isLatest ? 'rgba(99, 102, 241, 0.08)' : 'rgba(15, 23, 42, 0.4)',
                    border: `1px solid ${sub.isLatest ? 'rgba(99, 102, 241, 0.3)' : 'var(--cg-border)'}`,
                    borderRadius: '10px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--cg-text)' }}>
                      Version {sub.version}
                    </div>
                    {sub.isLatest && (
                      <span
                        style={{
                          background: 'var(--cg-primary)',
                          color: '#fff',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          letterSpacing: '0.5px',
                        }}
                      >
                        LATEST
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>
                    File: <code>{sub.fileName}</code>
                  </div>

                  <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>
                    {formatDate(sub.submittedAt)}
                  </div>

                  <span className={`status-badge status-${sub.status === 'fingerprinted' ? 'completed' : 'processing'}`}>
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
