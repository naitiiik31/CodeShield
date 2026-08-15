import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../services/api.js';

function getRawRiskLevel(rawScore) {
  const pct = rawScore * 100;
  if (pct >= 70) return 'high';
  if (pct >= 40) return 'medium';
  return 'low';
}

function formatRankDisplay(rank) {
  return `#${rank}`;
}

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

  if (loading) {
    return (
      <div className="page-container">
        <div className="status-badge status-processing">Loading similarity results...</div>
      </div>
    );
  }

  // 1. Sort all results by rawScore descending for Competition Ranking
  const sortedByRaw = [...results].sort((a, b) => b.rawScore - a.rawScore);

  // 2. Compute Competition Ranking (1, 2, 2, 4, 4, 6) & Raw-based Risk Level
  let currentRank = 1;
  const rankedResults = sortedByRaw.map((res, index) => {
    const scorePct = (res.rawScore * 100).toFixed(1);
    if (index > 0) {
      const prevScorePct = (sortedByRaw[index - 1].rawScore * 100).toFixed(1);
      if (scorePct !== prevScorePct) {
        currentRank = index + 1; // Competition rank skips
      }
    }
    const rawRiskLevel = getRawRiskLevel(res.rawScore);
    return {
      ...res,
      rank: currentRank,
      scorePct,
      rawRiskLevel,
    };
  });

  // 3. Filter by Risk Level
  const filteredResults = rankedResults.filter(
    (r) => filterRisk === 'all' || r.rawRiskLevel === filterRisk
  );

  // 4. Sort Results (High->Low or Low->High)
  const displayResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'raw_asc') {
      return a.rawScore - b.rawScore;
    }
    return b.rawScore - a.rawScore;
  });

  // Summary Metrics based on Raw Similarity
  const highRiskCount = rankedResults.filter((r) => r.rawRiskLevel === 'high').length;
  const mediumRiskCount = rankedResults.filter((r) => r.rawRiskLevel === 'medium').length;
  const avgRawSim =
    rankedResults.length > 0
      ? (rankedResults.reduce((acc, r) => acc + r.rawScore, 0) / rankedResults.length) * 100
      : 0;

  // Chart Data based on Raw Similarity distribution
  const rawDistribution = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0 };
  rankedResults.forEach((r) => {
    const pct = r.rawScore * 100;
    if (pct < 20) rawDistribution['0-20']++;
    else if (pct < 40) rawDistribution['20-40']++;
    else if (pct < 60) rawDistribution['40-60']++;
    else if (pct < 80) rawDistribution['60-80']++;
    else rawDistribution['80-100']++;
  });

  const chartData = Object.entries(rawDistribution).map(([range, count]) => ({
    range: `${range}%`,
    count,
  }));

  return (
    <div className="page-container fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Similarity Investigation</h1>
          <p className="page-subtitle">Ranked suspicious submission pairs for assignment</p>
        </div>
        <button onClick={handleTriggerAnalysis} className="btn btn-primary" disabled={analyzing}>
          {analyzing ? 'Analyzing...' : 'Run / Re-Run Analysis'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics?.totalSubmissions ?? (results.length > 0 ? Math.ceil(Math.sqrt(results.length * 2)) : 0)}</div>
          <div className="stat-label">Total Submissions</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--cg-danger)' }}>{highRiskCount}</div>
          <div className="stat-label">High-Risk Pairs (≥70%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--cg-warning)' }}>{mediumRiskCount}</div>
          <div className="stat-label">Medium-Risk Pairs (40-69%)</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgRawSim.toFixed(1)}%</div>
          <div className="stat-label">Average Code Similarity</div>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="glass-card" style={{ marginBottom: '32px', textAlign: 'center', padding: '32px 24px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--cg-text)', marginBottom: '8px' }}>
            No Analysis Results Generated Yet
          </h3>
          <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto 16px auto' }}>
            Click 'Run / Re-Run Analysis' to process student submissions, calculate code similarity, and generate suspicious pair reports.
          </p>
          <button onClick={handleTriggerAnalysis} className="btn btn-primary" disabled={analyzing}>
            {analyzing ? 'Analyzing Submissions...' : 'Run / Re-Run Analysis'}
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px' }}>Code Similarity Distribution</h3>
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
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Suspicious Pairs ({displayResults.length})</h2>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sort Control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', fontWeight: 500 }}>Sort by:</label>
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.85rem', width: 'auto' }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="raw_desc">Code Similarity: High → Low</option>
              <option value="raw_asc">Code Similarity: Low → High</option>
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
              <th style={{ width: '90px' }}>Rank</th>
              <th>Student A</th>
              <th>Student B</th>
              <th
                onClick={() => setSortBy((prev) => (prev === 'raw_desc' ? 'raw_asc' : 'raw_desc'))}
                style={{ cursor: 'pointer', userSelect: 'none' }}
                title="Click to sort by Code Similarity"
              >
                Code Similarity {sortBy === 'raw_desc' ? '▼' : sortBy === 'raw_asc' ? '▲' : ''}
              </th>
              <th>Risk Level</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {displayResults.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--cg-text-muted)', padding: '32px' }}>
                  No suspicious pairs found matching this filter.
                </td>
              </tr>
            ) : (
              displayResults.map((res) => (
                <tr key={res._id}>
                  <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {formatRankDisplay(res.rank)}
                  </td>
                  <td style={{ fontWeight: 600 }}>{res.studentNameA || res.studentIdentifierA || 'Student A'}</td>
                  <td style={{ fontWeight: 600 }}>{res.studentNameB || res.studentIdentifierB || 'Student B'}</td>
                  <td style={{ fontWeight: 700, color: 'var(--cg-text)' }}>
                    {res.scorePct}%
                  </td>
                  <td>
                    <span className={`badge badge-${res.rawRiskLevel}`}>
                      {res.rawRiskLevel.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link to={`/results/${res._id}`} className="btn btn-sm btn-primary">
                      Compare Code
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
