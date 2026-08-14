import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DiffEditor } from '@monaco-editor/react';
import api from '../services/api.js';

export default function ComparisonView() {
  const { id } = useParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await api.get(`/results/${id}/detail`);
        setDetail(res.data);
      } catch (err) {
        console.error('Failed to load result detail:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="page-container"><div className="status-badge status-processing">Loading comparison...</div></div>;
  }

  if (!detail) {
    return <div className="page-container"><div className="alert alert-error">Result detail not found</div></div>;
  }

  return (
    <div className="page-container fade-in" style={{ maxWidth: '1600px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to={`/assignments/${detail.assignmentId || ''}/results`} style={{ fontSize: '0.85rem', color: 'var(--cg-primary-light)', marginBottom: '8px', display: 'inline-block' }}>
            ← Back to Results List
          </Link>
          <h1 className="page-title">
            Side-by-Side Comparison: {detail.studentA?.name} vs {detail.studentB?.name}
          </h1>
          <p className="page-subtitle">
            Language: <strong>{detail.language}</strong> | Risk Level: <span className={`badge badge-${detail.riskLevel}`}>{detail.riskLevel.toUpperCase()}</span>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cg-accent)' }}>{(detail.rawScore * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)' }}>Raw Similarity</div>
          </div>
          <div className="glass-card" style={{ padding: '10px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cg-warning)' }}>{(detail.boilerplateOverlap * 100).toFixed(1)}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)' }}>Boilerplate Overlap</div>
          </div>
          <div className="glass-card" style={{ padding: '10px 16px', textAlign: 'center', borderColor: 'var(--cg-primary)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: detail.riskLevel === 'high' ? 'var(--cg-danger)' : 'var(--cg-primary-light)' }}>
              {(detail.adjustedScore * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--cg-text-muted)' }}>Adjusted Similarity</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600 }}>
            <div>Student A: {detail.studentA?.name} ({detail.fileNameA})</div>
            <div>Student B: {detail.studentB?.name} ({detail.fileNameB})</div>
          </div>

          <div style={{ border: '1px solid var(--cg-border)', borderRadius: '8px', overflow: 'hidden', height: '600px' }}>
            <DiffEditor
              height="100%"
              language={detail.language === 'csharp' ? 'csharp' : detail.language === 'cpp' ? 'cpp' : detail.language === 'c' ? 'c' : detail.language}
              theme="vs-dark"
              original={detail.codeA}
              modified={detail.codeB}
              options={{
                readOnly: true,
                fontSize: 13,
                minimap: { enabled: false },
                renderSideBySide: true,
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        <div>
          <div className="glass-card" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔍 Why Are These Submissions Similar?
            </h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {detail.explanation?.map((point, i) => (
                <li key={i} style={{
                  padding: '10px 14px',
                  marginBottom: '8px',
                  borderRadius: '8px',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.15)',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                }}>
                  • {point}
                </li>
              ))}
            </ul>
          </div>

          {detail.semanticScore !== undefined && detail.semanticScore >= 0 && (
            <div className="glass-card" style={{ borderColor: 'rgba(6, 182, 212, 0.3)', background: 'rgba(6, 182, 212, 0.05)', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--cg-accent)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🤖 AI Semantic Analysis (Advisory)
              </h3>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
                Semantic Score: {(detail.semanticScore * 100).toFixed(1)}%
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', lineHeight: 1.5 }}>
                {detail.aiExplanation}
              </p>
            </div>
          )}

          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
              Matched Regions ({detail.matchedRegions?.length || 0})
            </h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {detail.matchedRegions?.map((r, i) => (
                <div key={i} style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--cg-bg)',
                  fontSize: '0.8rem',
                  marginBottom: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <span>Student A Lines: L{r.startLineA}-L{r.endLineA}</span>
                  <span>Student B Lines: L{r.startLineB}-L{r.endLineB}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
