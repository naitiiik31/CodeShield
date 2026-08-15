import React, { useState } from 'react';
import api from '../services/api.js';
import Modal from './common/Modal.jsx';

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

  const footer = (
    <>
      <button type="button" onClick={onClose} className="btn btn-secondary" disabled={uploading}>
        Cancel
      </button>
      <button type="submit" form="faculty-upload-form" className="btn btn-primary" disabled={uploading}>
        {uploading ? 'Processing & Queuing...' : 'Upload & Queue Processing'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={Boolean(assignment)}
      onClose={onClose}
      category="Faculty Upload"
      title={`Upload Submissions: ${assignment.title}`}
      subtitle="Upload bulk student source code or ZIP archive for automatic plagiarism processing"
      maxWidth="620px"
      footer={footer}
    >
      {error && <div className="alert alert-error">{error}</div>}

      <form id="faculty-upload-form" onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            ZIP containing student source code files. CodeShield will automatically extract and process all code files.
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--cg-border)', paddingTop: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px', color: 'var(--cg-text)' }}>Optional: CSV Student Identity Mapping</h4>
          <div className="form-group" style={{ marginBottom: '12px' }}>
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
              placeholder={'student_id,name,filename\n21CS001,Rahul,21CS001.cpp\n21CS002,Aman,21CS002.cpp'}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
              If omitted, student IDs are automatically derived from submission filenames (e.g. <code>21CS001.cpp</code> → <code>21CS001</code>).
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
