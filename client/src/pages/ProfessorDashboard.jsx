import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import FacultyUploadModal from '../components/FacultyUploadModal.jsx';
import CreateAssignmentModal from '../components/CreateAssignmentModal.jsx';
import EditDeadlineModal from '../components/EditDeadlineModal.jsx';
import SubmissionMonitorModal from '../components/SubmissionMonitorModal.jsx';

export default function ProfessorDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeadlineAssignment, setEditingDeadlineAssignment] = useState(null);
  const [activeUploadAssignment, setActiveUploadAssignment] = useState(null);
  const [actionMessage, setActionMessage] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [assignmentSubmissions, setAssignmentSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedAssignmentId) {
      fetchSubmissionsForAssignment(selectedAssignmentId);
    }
  }, [selectedAssignmentId]);

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/assignments');
      setAssignments(res.data);
    } catch (err) {
      console.error('Failed to fetch assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionsForAssignment = async (id) => {
    setLoadingSubmissions(true);
    try {
      const res = await api.get(`/submissions/assignments/${id}`);
      setAssignmentSubmissions(res.data);
    } catch (err) {
      console.error('Failed to fetch submissions for assignment:', err);
      setAssignmentSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleTriggerAnalysis = async (assignmentId) => {
    try {
      const res = await api.post(`/assignments/${assignmentId}/analyze`);
      setActionMessage(`${res.data.message || 'Analysis queued successfully!'}`);
      setTimeout(() => setActionMessage(''), 4000);
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to trigger analysis');
    }
  };

  const handleAssignmentCreated = (msg) => {
    setActionMessage(msg || 'Assignment created successfully!');
    setTimeout(() => setActionMessage(''), 4000);
    fetchAssignments();
  };

  const copyToClipboard = (text, type, id) => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } else {
      setCopiedLinkId(id);
      setTimeout(() => setCopiedLinkId(null), 2000);
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

  if (loading) {
    return <div className="page-container"><div className="status-badge status-processing">Loading Faculty Dashboard...</div></div>;
  }

  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionCount || 0), 0);
  const completedAssignments = assignments.filter((a) => a.analysisStatus === 'completed').length;
  const queuedAssignments = assignments.filter((a) => a.analysisStatus === 'queued' || a.analysisStatus === 'processing').length;
  const selectedAssignment = assignments.find((a) => a._id === selectedAssignmentId);

  // Derive unique student submissions for selected assignment
  const studentLatestMap = new Map();
  assignmentSubmissions.forEach((sub) => {
    if (!studentLatestMap.has(sub.studentIdentifier)) {
      studentLatestMap.set(sub.studentIdentifier, sub);
    } else {
      const existing = studentLatestMap.get(sub.studentIdentifier);
      if (sub.version > existing.version) {
        studentLatestMap.set(sub.studentIdentifier, sub);
      }
    }
  });

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Faculty Assignment & Plagiarism Hub</h1>
          <p className="page-subtitle">Create assignments, track student submissions, run analysis, and review similarity evidence</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-lg">
          + Create New Assignment
        </button>
      </div>

      {actionMessage && <div className="alert alert-success">{actionMessage}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{assignments.length}</div>
          <div className="stat-label">Total Assignments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--cg-accent)' }}>
            {totalSubmissions}
          </div>
          <div className="stat-label">Student Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--cg-warning)' }}>
            {completedAssignments}
          </div>
          <div className="stat-label">Analyzed Assignments</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--cg-primary-light)' }}>
            {queuedAssignments}
          </div>
          <div className="stat-label">Queued Jobs</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Active Assignments</h2>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title & Code</th>
              <th>Language</th>
              <th>Deadline</th>
              <th>Submissions</th>
              <th>Analysis Status</th>
              <th>Faculty Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--cg-text-muted)' }}>
                  No assignments created yet. Click "+ Create New Assignment" to start.
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => {
                const isSelected = selectedAssignmentId === assignment._id;
                const submissionCount = assignment.submissionCount || 0;
                const subLink = `${window.location.origin}/submit/${assignment.assignmentCode || 'BST-7K42'}`;

                return (
                  <tr
                    key={assignment._id}
                    style={{
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : undefined,
                      borderLeft: isSelected ? '4px solid var(--cg-primary)' : 'none',
                    }}
                  >
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cg-text)' }}>
                        {assignment.title}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.15)', color: 'var(--cg-primary)', padding: '2px 8px', borderRadius: '6px' }}>
                          {assignment.targetGroup?.department || 'CSE'} / {assignment.targetGroup?.division || 'D3'} / {assignment.targetGroup?.batch || '2023'}
                        </span>
                        <code style={{ fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--cg-text-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {assignment.assignmentCode || 'BST-7K42'}
                        </code>
                        <button
                          onClick={() => copyToClipboard(assignment.assignmentCode || 'BST-7K42', 'code', assignment._id)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                        >
                          {copiedCodeId === assignment._id ? '✓ Copied' : 'Copy Code'}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-low" style={{ textTransform: 'uppercase' }}>
                        {assignment.languageAllowed}
                      </span>
                    </td>
                    <td>{formatDate(assignment.deadline)}</td>
                    <td>
                      <strong style={{ color: submissionCount > 0 ? '#10b981' : 'var(--cg-text-muted)' }}>
                        {submissionCount}
                      </strong>{' '}
                      submitted
                    </td>
                    <td>
                      <span className={`status-badge status-${assignment.analysisStatus === 'completed' ? 'completed' : assignment.analysisStatus === 'ready' ? 'processing' : 'idle'}`}>
                        {assignment.analysisStatus === 'completed'
                          ? 'Completed'
                          : assignment.analysisStatus === 'ready'
                          ? 'Ready for analysis'
                          : assignment.analysisStatus === 'processing'
                          ? 'Processing'
                          : 'Not analyzed'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setEditingDeadlineAssignment(assignment)}
                          className="btn btn-sm btn-secondary"
                        >
                          Edit Deadline
                        </button>
                        <button
                          onClick={() => setSelectedAssignmentId(assignment._id)}
                          className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          Monitor Submissions
                        </button>
                        <button
                          onClick={() => handleTriggerAnalysis(assignment._id)}
                          className="btn btn-sm btn-secondary"
                          disabled={assignment.analysisStatus === 'processing' || assignment.analysisStatus === 'queued' || submissionCount < 2}
                        >
                          Analyze Submissions
                        </button>
                        <Link to={`/assignments/${assignment._id}/results`} className="btn btn-sm btn-primary">
                          Plagiarism Report
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* SUBMISSION MONITOR MODAL */}
      {selectedAssignmentId && selectedAssignment && (
        <SubmissionMonitorModal
          assignment={selectedAssignment}
          submissions={assignmentSubmissions}
          loading={loadingSubmissions}
          onClose={() => setSelectedAssignmentId(null)}
        />
      )}

      {/* Upload Submissions Modal */}
      {activeUploadAssignment && (
        <FacultyUploadModal
          assignment={activeUploadAssignment}
          onClose={() => setActiveUploadAssignment(null)}
          onSuccess={fetchAssignments}
        />
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <CreateAssignmentModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleAssignmentCreated}
        />
      )}

      {/* Edit Deadline Modal */}
      {editingDeadlineAssignment && (
        <EditDeadlineModal
          assignment={editingDeadlineAssignment}
          onClose={() => setEditingDeadlineAssignment(null)}
          onSuccess={(msg) => {
            setActionMessage(msg || 'Deadline updated successfully.');
            setTimeout(() => setActionMessage(''), 4000);
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
}
