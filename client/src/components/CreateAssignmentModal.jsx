import React, { useState } from 'react';
import api from '../services/api.js';

export default function CreateAssignmentModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [languageAllowed, setLanguageAllowed] = useState('python');
  const [deadline, setDeadline] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);
  const [starterCode, setStarterCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setTitleTouched(true);
      return;
    }

    setCreating(true);
    setError('');

    try {
      await api.post('/assignments', {
        title: title.trim(),
        description: description.trim(),
        languageAllowed,
        deadline: new Date(deadline || Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        similarityThreshold: Number(similarityThreshold),
        boilerplateSettings: {
          enabled: true,
          threshold: 0.8,
          starterCode,
        },
      });

      if (onSuccess) onSuccess('✅ Assignment created successfully!');
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const isTitleInvalid = titleTouched && !title.trim();

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
          maxWidth: '640px',
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          border: '1px solid var(--cg-border)',
          borderRadius: '16px',
        }}
      >
        {/* STICKY HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--cg-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: 'rgba(30, 41, 59, 0.6)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--cg-text)' }}>
              Create Assignment
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', margin: '4px 0 0 0' }}>
              Configure an assignment and prepare it for code similarity analysis.
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn btn-sm btn-secondary"
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ margin: '16px 24px 0 24px', flexShrink: 0 }}>
            ⚠️ {error}
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <form
          id="create-assignment-form"
          onSubmit={handleSubmit}
          style={{
            overflowY: 'auto',
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* SECTION 1: ASSIGNMENT DETAILS */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--cg-border)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span> 1. Assignment Details
            </h3>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Assignment Title <span style={{ color: 'var(--cg-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                style={{
                  borderColor: isTitleInvalid ? 'var(--cg-danger)' : undefined,
                }}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleTouched) setTitleTouched(false);
                }}
                onBlur={() => setTitleTouched(true)}
                required
                placeholder="e.g. CS201: Binary Search Tree Implementation"
              />
              {isTitleInvalid && (
                <div style={{ color: 'var(--cg-danger)', fontSize: '0.75rem', marginTop: '4px' }}>
                  ⚠️ Assignment title is required.
                </div>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide instructions for students..."
              />
            </div>
          </div>

          {/* SECTION 2: ANALYSIS CONFIGURATION */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--cg-border)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> 2. Analysis Configuration
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Allowed Language</label>
                <select
                  className="form-select"
                  value={languageAllowed}
                  onChange={(e) => setLanguageAllowed(e.target.value)}
                >
                  <option value="python">🐍 Python (.py)</option>
                  <option value="javascript">🟨 JavaScript (.js)</option>
                  <option value="java">☕ Java (.java)</option>
                  <option value="cpp">⚡ C++ (.cpp)</option>
                  <option value="c">🔵 C (.c)</option>
                  <option value="csharp">🟦 C# (.cs)</option>
                  <option value="auto">✨ Multi-Language / Auto Detect</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Similarity Threshold</label>
                <select
                  className="form-select"
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                >
                  <option value={0.3}>30% (Strict Flagging)</option>
                  <option value={0.5}>50% (Standard Flagging)</option>
                  <option value={0.7}>70% (Lenient Flagging)</option>
                </select>
                <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
                  Pairs above this adjusted score will be flagged for faculty review.
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Submission Deadline</label>
              <input
                type="datetime-local"
                className="form-input"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 3: CODE ANALYSIS & STARTER BOILERPLATE */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid var(--cg-border)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💻</span> 3. Code Analysis & Boilerplate Exclusion
            </h3>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Starter / Boilerplate Code (Optional)
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginBottom: '8px', marginTop: '2px' }}>
                Optional: paste the starter code provided to all students. CodeGuard will exclude common starter code from plagiarism evidence.
              </p>
              <textarea
                className="form-textarea"
                rows={4}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                }}
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                placeholder="# Paste template code shared with all students..."
              />
            </div>
          </div>
        </form>

        {/* STICKY FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--cg-border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: 'rgba(30, 41, 59, 0.6)',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-assignment-form"
            className="btn btn-primary"
            disabled={creating || !title.trim()}
          >
            {creating ? 'Creating Assignment...' : 'Create Assignment'}
          </button>
        </div>
      </div>
    </div>
  );
}
