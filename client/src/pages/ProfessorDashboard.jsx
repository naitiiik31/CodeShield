import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api.js';
import FacultyUploadModal from '../components/FacultyUploadModal.jsx';
import CreateAssignmentModal from '../components/CreateAssignmentModal.jsx';

export default function ProfessorDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeUploadAssignment, setActiveUploadAssignment] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchAssignments();
    const interval = setInterval(fetchAssignments, 5000); // Polling status updates
    return () => clearInterval(interval);
  }, []);

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

  const handleTriggerAnalysis = async (assignmentId) => {
    try {
      const res = await api.post(`/assignments/${assignmentId}/analyze`);
      setActionMessage(`⚡ ${res.data.message || 'Analysis queued successfully!'}`);
      setTimeout(() => setActionMessage(''), 4000);
      fetchAssignments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to trigger analysis');
    }
  };

  const handleAssignmentCreated = (msg) => {
    setActionMessage(msg || '✅ Assignment created successfully!');
    setTimeout(() => setActionMessage(''), 4000);
    fetchAssignments();
  };

  if (loading) {
    return <div className="page-container"><div className="status-badge status-processing">Loading Faculty Dashboard...</div></div>;
  }

  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionCount || 0), 0);
  const completedAssignments = assignments.filter((a) => a.analysisStatus === 'completed').length;
  const queuedAssignments = assignments.filter((a) => a.analysisStatus === 'queued' || a.analysisStatus === 'processing').length;

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Faculty Plagiarism Operations Hub</h1>
          <p className="page-subtitle">Manage assignments, upload student submissions (Files/ZIP), run BullMQ analysis, and review evidence reports</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
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
          <div className="stat-label">Uploaded Student Submissions</div>
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
          <div className="stat-label">Queued / Processing Jobs</div>
        </div>
      </div>

      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '16px' }}>Active Assignments & Submissions</h2>
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Allowed Language</th>
              <th>Deadline</th>
              <th>Threshold</th>
              <th>Submissions</th>
              <th>Analysis Status</th>
              <th>Faculty Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--cg-text-muted)' }}>
                  No assignments created yet. Click "+ Create New Assignment" to start.
                </td>
              </tr>
            ) : (
              assignments.map((assignment) => (
                <tr key={assignment._id}>
                  <td style={{ fontWeight: 600 }}>{assignment.title}</td>
                  <td>
                    <span className="badge badge-low" style={{ textTransform: 'uppercase' }}>{assignment.languageAllowed}</span>
                  </td>
                  <td>{new Date(assignment.deadline).toLocaleDateString()}</td>
                  <td>{(assignment.similarityThreshold * 100).toFixed(0)}%</td>
                  <td>{assignment.submissionCount ?? 0}</td>
                  <td>
                    <span className={`status-badge status-${assignment.analysisStatus}`}>
                      {assignment.analysisStatus}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setActiveUploadAssignment(assignment)}
                        className="btn btn-sm btn-secondary"
                      >
                        📤 Upload Code / ZIP
                      </button>
                      <button
                        onClick={() => handleTriggerAnalysis(assignment._id)}
                        className="btn btn-sm btn-secondary"
                        disabled={assignment.analysisStatus === 'processing' || assignment.analysisStatus === 'queued'}
                      >
                        ⚡ Analyze
                      </button>
                      <Link to={`/assignments/${assignment._id}/results`} className="btn btn-sm btn-primary">
                        📊 Results Report
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}
