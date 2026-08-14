import React, { useState } from 'react';
import api from '../services/api.js';

export default function FacultyUploadModal({ assignment, onClose, onSuccess }) {
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFiles && !zipFile) {
      setError('Please select source files or a ZIP archive to upload.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    if (selectedFiles) {
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('files', selectedFiles[i]);
      }
    }
    if (zipFile) {
      formData.append('zipFile', zipFile);
    }
    if (csvFile) {
      formData.append('csvFile', csvFile);
    }
    if (csvText) {
      formData.append('csvMapping', csvText);
    }

    try {
      const res = await api.post(`/submissions/assignments/${assignment._id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      alert(res.data.message || 'Submissions uploaded & queued successfully!');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload submissions');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        className="glass-card fade-in"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Upload Submissions: {assignment.title}</h2>
          <button onClick={onClose} className="btn btn-sm btn-secondary">✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ flexShrink: 0 }}>⚠️ {error}</div>}

        {/* Scrollable Form Body */}
        <form onSubmit={handleUpload} style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          <div className="form-group">
            <label className="form-label">Option 1: Upload Source Code Files (Multiple allowed)</label>
            <input
              type="file"
              multiple
              accept=".py,.js,.jsx,.java,.cpp,.cc,.c,.cs,.txt"
              className="form-input"
              onChange={(e) => setSelectedFiles(e.target.files)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
              Supported: .py, .js, .java, .cpp, .c, .cs (e.g. <code>21CS001.cpp</code>, <code>21CS002.cpp</code>)
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Option 2: Upload Submissions ZIP Archive</label>
            <input
              type="file"
              accept=".zip"
              className="form-input"
              onChange={(e) => setZipFile(e.target.files?.[0] || null)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
              ZIP containing student source code files. CodeGuard will automatically extract and process all code files.
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--cg-border)', margin: '16px 0', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Optional: CSV Student Identity Mapping</h4>
            <div className="form-group">
              <label className="form-label">Upload CSV Mapping File (.csv)</label>
              <input
                type="file"
                accept=".csv"
                className="form-input"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Or Paste CSV Text</label>
              <textarea
                className="form-textarea"
                rows={3}
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                placeholder="student_id,name,filename&#10;21CS001,Rahul,21CS001.cpp&#10;21CS002,Aman,21CS002.cpp"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
                If omitted, student IDs are automatically derived from submission filenames (e.g. <code>21CS001.cpp</code> → <code>21CS001</code>).
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingBottom: '4px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Processing & Queuing...' : '🚀 Upload & Queue BullMQ Processing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
