import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api.js';
import CloseButton from './common/CloseButton.jsx';

export default function CreateAssignmentModal({ onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [languageAllowed, setLanguageAllowed] = useState('python');
  const [deadline, setDeadline] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);

  // Target Academic Group
  const [department, setDepartment] = useState('CSE');
  const [division, setDivision] = useState('D3');
  const [batch, setBatch] = useState('2023');

  const [starterCode, setStarterCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [createdAssignment, setCreatedAssignment] = useState(null);

  const modalBodyRef = useRef(null);

  useLayoutEffect(() => {
    // Lock background page scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Force scrollTop = 0 ONLY on initial mount
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []); // Run ONLY once on mount

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setTitleTouched(true);
      if (modalBodyRef.current) {
        modalBodyRef.current.scrollTop = 0;
      }
      return;
    }

    setCreating(true);

    try {
      const res = await api.post('/assignments', {
        title: title.trim(),
        description: description.trim(),
        targetGroup: {
          department,
          division,
          batch,
        },
        languageAllowed,
        deadline: new Date(deadline || Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        similarityThreshold: Number(similarityThreshold),
        boilerplateSettings: {
          enabled: true,
          threshold: 0.8,
          starterCode,
        },
      });

      setCreatedAssignment(res.data);
      if (onSuccess) onSuccess('Assignment created successfully!');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const isTitleInvalid = titleTouched && !title.trim();

  const modalContent = (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justify: 'center',
        alignItems: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#1e293b',
          border: '1px solid var(--cg-border)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
          color: 'var(--cg-text)',
        }}
      >
        {createdAssignment ? (
          <div style={{ padding: '32px 28px', textAlign: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '20px', right: '24px' }}>
              <CloseButton onClick={onClose} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 8px 0', color: '#10b981' }}>
              Assignment Created Successfully!
            </h2>
            <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Students in <strong style={{ color: '#fff' }}>{createdAssignment.targetGroup?.department || department} / {createdAssignment.targetGroup?.division || division} / {createdAssignment.targetGroup?.batch || batch}</strong> can now view and submit to this assignment.
            </p>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--cg-border)', borderRadius: '12px', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Assignment Title
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cg-text)' }}>
                  {createdAssignment.title}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Target Academic Group
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cg-primary)' }}>
                  {createdAssignment.targetGroup?.department} / {createdAssignment.targetGroup?.division} / {createdAssignment.targetGroup?.batch}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Assignment Code
                </div>
                <code style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '2px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--cg-primary)', padding: '6px 12px', borderRadius: '8px', display: 'inline-block' }}>
                  {createdAssignment.assignmentCode}
                </code>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          <>
            {/* HEADER (ALWAYS VISIBLE AT TOP, NEVER SCROLLS) */}
            <div
              style={{
                padding: '20px 28px',
                borderBottom: '1px solid var(--cg-border)',
                display: 'flex',
                flexDirection: 'column',
                justify: 'center',
                background: '#1e293b',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              <div style={{ paddingRight: '44px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--cg-text)' }}>
                  Create New Assignment
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', margin: '4px 0 0 0' }}>
                  Create an assignment for your students
                </p>
              </div>
              <div style={{ position: 'absolute', top: '20px', right: '24px' }}>
                <CloseButton onClick={onClose} />
              </div>
            </div>

            {error && (
              <div className="alert alert-error" style={{ margin: '16px 24px 0 24px', flexShrink: 0 }}>
                {error}
              </div>
            )}

            {/* SCROLLABLE FORM BODY (ONLY THIS SCROLLS, STARTS AT scrollTop = 0) */}
            <form
              id="create-assignment-form"
              onSubmit={handleSubmit}
              noValidate
              ref={modalBodyRef}
              style={{
                overflowY: 'auto',
                overflowX: 'hidden',
                flex: 1,
                minHeight: 0,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              {/* SECTION 1: ASSIGNMENT TITLE & DESCRIPTION */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--cg-border)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '16px' }}>
                  1. Assignment Details
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
                    placeholder="e.g. Data Structures Assignment 3"
                  />
                  {isTitleInvalid && (
                    <div style={{ color: 'var(--cg-danger)', fontSize: '0.8rem', marginTop: '6px' }}>
                      Assignment title is required.
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
                    placeholder="Implement insertion, deletion and search for a Binary Search Tree..."
                  />
                </div>
              </div>

              {/* SECTION 2: TARGET ACADEMIC GROUP SELECTION */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--cg-border)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '16px' }}>
                  2. Target Academic Group
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Department</label>
                    <select className="form-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Division</label>
                    <select className="form-select" value={division} onChange={(e) => setDivision(e.target.value)}>
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                      <option value="D4">D4</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Batch</label>
                    <select className="form-select" value={batch} onChange={(e) => setBatch(e.target.value)}>
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>
                </div>

                <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem' }}>
                  Selected Group: <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{department} / {division} / {batch}</strong>
                  <div style={{ color: 'var(--cg-text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                    Only students registered in {department} / {division} / {batch} will be able to see and submit to this assignment.
                  </div>
                </div>
              </div>

              {/* SECTION 3: LANGUAGE & DEADLINE & THRESHOLD */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--cg-border)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '16px' }}>
                  3. Submission & Analysis Parameters
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Allowed Language</label>
                    <select
                      className="form-select"
                      value={languageAllowed}
                      onChange={(e) => setLanguageAllowed(e.target.value)}
                    >
                      <option value="python">Python (.py)</option>
                      <option value="javascript">JavaScript (.js)</option>
                      <option value="java">Java (.java)</option>
                      <option value="cpp">C++ (.cpp)</option>
                      <option value="c">C (.c)</option>
                      <option value="csharp">C# (.cs)</option>
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

              {/* SECTION 4: STARTER BOILERPLATE CODE */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--cg-border)',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--cg-accent)', marginBottom: '8px' }}>
                  4. Starter / Boilerplate Code (Optional)
                </h3>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      background: 'rgba(15, 23, 42, 0.8)',
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                    }}
                    value={starterCode}
                    onChange={(e) => setStarterCode(e.target.value)}
                    placeholder="// Optional template code shared with all students..."
                  />
                </div>
              </div>
            </form>

            {/* FOOTER (ALWAYS VISIBLE AT BOTTOM, NEVER SCROLLS) */}
            <div
              style={{
                padding: '16px 24px',
                borderTop: '1px solid var(--cg-border)',
                display: 'flex',
                justify: 'flex-end',
                gap: '12px',
                background: '#1e293b',
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
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
