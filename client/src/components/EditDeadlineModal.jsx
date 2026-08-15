import React, { useState } from 'react';
import api from '../services/api.js';
import Modal from './common/Modal.jsx';

export default function EditDeadlineModal({ assignment, onClose, onSuccess }) {
  const [deadline, setDeadline] = useState(
    assignment?.deadline
      ? new Date(new Date(assignment.deadline).getTime() - new Date().getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16)
      : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const formatDate = (dStr) => {
    if (!dStr) return '—';
    return new Date(dStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deadline) {
      setError('Please select a valid date and time.');
      return;
    }

    const selectedDate = new Date(deadline);
    if (selectedDate.getTime() <= Date.now()) {
      setError('Deadline must be in the future.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const res = await api.patch(`/assignments/${assignment._id}/deadline`, {
        deadline: selectedDate.toISOString(),
      });
      if (onSuccess) {
        onSuccess(res.data.message || 'Deadline updated successfully.');
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Failed to update deadline'
      );
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="btn btn-secondary" disabled={saving}>
        Cancel
      </button>
      <button
        type="submit"
        form="edit-deadline-form"
        className="btn btn-primary"
        disabled={saving || !deadline}
      >
        {saving ? 'Saving Deadline...' : 'Save Deadline'}
      </button>
    </>
  );

  if (!assignment) return null;

  return (
    <Modal
      isOpen={Boolean(assignment)}
      onClose={onClose}
      category="Faculty Assignment Settings"
      title="Edit Assignment Deadline"
      subtitle={`Modify submission deadline for "${assignment.title}"`}
      maxWidth="500px"
      footer={footer}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.4)',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid var(--cg-border)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cg-text)' }}>
          {assignment.title}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
          Target Group:{' '}
          <strong style={{ color: 'var(--cg-primary)' }}>
            {assignment.targetGroup?.department || 'CSE'} / {assignment.targetGroup?.division || 'D3'} /{' '}
            {assignment.targetGroup?.batch || '2023'}
          </strong>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
          Current Deadline: <strong style={{ color: '#fff' }}>{formatDate(assignment.deadline)}</strong>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

      <form id="edit-deadline-form" onSubmit={handleSubmit} style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label className="form-label">New Submission Deadline *</label>
          <input
            type="datetime-local"
            className="form-input"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)', marginTop: '4px' }}>
            Select a date and time in the future. Students will immediately be subject to this updated deadline.
          </div>
        </div>
      </form>
    </Modal>
  );
}
