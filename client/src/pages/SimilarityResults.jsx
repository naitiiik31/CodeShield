import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api.js';

export default function SimilarityResults() {
  const { id } = useParams();
  const [results, setResults] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterRisk, setFilterRisk] = useState('all');
  const [sortBy, setSortBy] = useState('raw_desc');

  useEffect(() => {
    fetchResults();
  }, [id]);

  const fetchResults = async () => {
    try {
      const res = await api.get(`/assignments/${id}/results`);
      setResults(res.data.results || []);
      setAnalytics(res.data.analytics || null);
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/assignments/${id}/analyze`);
      alert('Analysis started successfully!');
      fetchResults();
    } catch (err) {
      alert(err.response?.data?.error || 'Analysis trigger failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleColumnSort = (columnKey) => {
    if (columnKey === 'raw') {
      setSortBy((prev) => (prev === 'raw_desc' ? 'raw_asc' : 'raw_desc'));
    } else if (columnKey === 'bp') {
      setSortBy((prev) => (prev === 'bp_desc' ? 'bp_asc' : 'bp_desc'));
    } else if (columnKey === 'adj') {
      setSortBy((prev) => (prev === 'adj_desc' ? 'adj_asc' : 'adj_desc'));
    }
  };

  if (loading) {
    return <div className="page-container"><div className="status-badge status-processing">Loading similarity results...</div></div>;
  }

  // 1. Filter by Risk Level
  const filteredResults = results.filter((r) => filterRisk === 'all' || r.riskLevel === filterRisk);

  // 2. Sort Results based on sortBy state
  const sortedResults = [...filteredResults].sort((a, b) => {
    switch (sortBy) {
      case 'raw_desc':
        return b.rawScore - a.rawScore;
      case 'raw_asc':
        return a.rawScore - b.rawScore;
      case 'bp_desc':
        return b.boilerplateOverlap - a.boilerplateOverlap;
      case 'bp_asc':
        return a.boilerplateOverlap - b.boilerplateOverlap;
      case 'adj_desc':
        return b.adjustedScore - a.adjustedScore;
      case 'adj_asc':
        return a.adjustedScore - b.adjustedScore;
      default:
        return b.rawScore - a.rawScore;
    }
  });

  const chartData = analytics
    ? Object.entries(analytics.distribution || {}).map(([range, count]) => ({
        range: `${range}%`,
        count,
      }))
    : [];

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Similarity Investigation</h1>
          <p className="page-subtitle">Ranked suspicious submission pairs for assignment</p>
        </div>
        <button onClick={handleTriggerAnalysis} className="btn btn-primary" disabled={analyzing}>
          {analyzing ? 'Analyzing...' : '⚡ Run / Re-Run Analysis'}
        </button>
      </div>

      {analytics && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{analytics.totalSubmissions}</div>
            <div className="stat-label">Total Submissions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--cg-danger)' }}>{analytics.highRiskPairs}</div>
            <div className="stat-label">High-Risk Pairs (≥Threshold)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--cg-warning)' }}>{analytics.mediumRiskPairs}</div>
            <div className="stat-label">Medium-Risk Pairs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{(analytics.averageSimilarity * 100).toFixed(1)}%</div>
            <div className="stat-label">Average Similarity</div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Similarity Distribution</h3>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="range" stroke="var(--cg-text-muted)" fontSize={12} />
                <YAxis stroke="var(--cg-text-muted)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--cg-bg-card)', border: '1px solid var(--cg-border)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index >= 3
                          ? 'var(--cg-danger)'
                          : index === 2
                          ? 'var(--cg-warning)'
                          : 'var(--cg-primary)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Suspicious Pairs ({sortedResults.length})</h2>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', fontWeight: 500 }}>Sort by:</label>
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="raw_desc">Raw Similarity: High → Low</option>
              <option value="raw_asc">Raw Similarity: Low → High</option>
              <option value="bp_desc">Boilerplate Overlap: High → Low</option>
              <option value="bp_asc">Boilerplate Overlap: Low → High</option>
              <option value="adj_desc">Adjusted Similarity: High → Low</option>
              <option value="adj_asc">Adjusted Similarity: Low → High</option>
            </select>
          </div>

          {/* Risk Level Filters */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['all', 'high', 'medium', 'low'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`btn btn-sm ${filterRisk === r ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textTransform: 'capitalize' }}
              >
                {r} Risk
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Student A</th>
              <th>Student B</th>
              <th
                onClick={() => handleColumnSort('raw')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to sort by Raw Similarity"
              >
                Raw Similarity {sortBy === 'raw_desc' ? '▼' : sortBy === 'raw_asc' ? '▲' : ''}
              </th>
              <th
                onClick={() => handleColumnSort('bp')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to sort by Boilerplate Overlap"
              >
                Boilerplate Overlap {sortBy === 'bp_desc' ? '▼' : sortBy === 'bp_asc' ? '▲' : ''}
              </th>
              <th
                onClick={() => handleColumnSort('adj')}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to sort by Adjusted Similarity"
              >
                Adjusted Similarity {sortBy === 'adj_desc' ? '▼' : sortBy === 'adj_asc' ? '▲' : ''}
              </th>
              <th>Risk Level</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--cg-text-muted)', padding: '32px' }}>
                  No suspicious pairs found matching this filter.
                </td>
              </tr>
            ) : (
              sortedResults.map((res) => {
                const isAllBoilerplate = res.rawScore > 0 && res.adjustedScore === 0;
                return (
                  <tr key={res._id}>
                    <td style={{ fontWeight: 600 }}>{res.studentNameA || res.studentIdentifierA || 'Student A'}</td>
                    <td style={{ fontWeight: 600 }}>{res.studentNameB || res.studentIdentifierB || 'Student B'}</td>
                    <td>{(res.rawScore * 100).toFixed(1)}%</td>
                    <td>{(res.boilerplateOverlap * 100).toFixed(1)}%</td>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{(res.adjustedScore * 100).toFixed(1)}%</span>
                        <div className="similarity-bar" style={{ width: '60px' }}>
                          <div
                            className="similarity-bar-fill"
                            style={{
                              width: `${res.adjustedScore * 100}%`,
                              background:
                                res.riskLevel === 'high'
                                  ? 'var(--cg-danger)'
                                  : res.riskLevel === 'medium'
                                  ? 'var(--cg-warning)'
                                  : 'var(--cg-success)',
                            }}
                          />
                        </div>
                        {isAllBoilerplate && (
                          <span
                            title="All detected overlap was classified as common boilerplate."
                            style={{ cursor: 'help', fontSize: '0.85rem' }}
                          >
                            ℹ️
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${res.riskLevel}`}>{res.riskLevel}</span>
                    </td>
                    <td>
                      <Link to={`/results/${res._id}`} className="btn btn-sm btn-primary">
                        Compare Code
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
