import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import api from '../services/api.js';

const PRESETS = {
  python: {
    a: `# Python Solution A\ndef calculate_sum(numbers):\n    total = 0\n    for num in numbers:\n        total += num\n    return total\n`,
    b: `# Python Solution B (Renamed variables)\ndef get_total(values):\n    result = 0\n    for item in values:\n        result += item\n    return result\n`,
  },
  javascript: {
    a: `// JavaScript Solution A\nfunction calculateSum(numbers) {\n  let total = 0;\n  for (let i = 0; i < numbers.length; i++) {\n    total += numbers[i];\n  }\n  return total;\n}\n`,
    b: `// JavaScript Solution B (Renamed variables)\nfunction getTotal(values) {\n  let result = 0;\n  for (let idx = 0; idx < values.length; idx++) {\n    result += values[idx];\n  }\n  return result;\n}\n`,
  },
  java: {
    a: `// Java Solution A\npublic class Solution {\n    public int calculateSum(int[] numbers) {\n        int total = 0;\n        for (int i = 0; i < numbers.length; i++) {\n            total += numbers[i];\n        }\n        return total;\n    }\n}\n`,
    b: `// Java Solution B (Renamed variables)\npublic class Solution {\n    public int getTotal(int[] values) {\n        int result = 0;\n        for (int idx = 0; idx < values.length; idx++) {\n            result += values[idx];\n        }\n        return result;\n    }\n}\n`,
  },
  cpp: {
    a: `// C++ Solution A\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint calculateSum(const vector<int>& numbers) {\n    int total = 0;\n    for (int num : numbers) {\n        total += num;\n    }\n    return total;\n}\n`,
    b: `// C++ Solution B (Renamed variables)\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nint getTotal(const vector<int>& values) {\n    int result = 0;\n    for (int val : values) {\n        result += val;\n    }\n    return result;\n}\n`,
  },
  c: {
    a: `// C Solution A\n#include <stdio.h>\n\nint calculate_sum(int arr[], int n) {\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n        total += arr[i];\n    }\n    return total;\n}\n`,
    b: `// C Solution B (Renamed variables)\n#include <stdio.h>\n\nint get_total(int values[], int count) {\n    int result = 0;\n    for (int idx = 0; idx < count; idx++) {\n        result += values[idx];\n    }\n    return result;\n}\n`,
  },
  csharp: {
    a: `// C# Solution A\nusing System;\n\npublic class Program {\n    public static int CalculateSum(int[] numbers) {\n        int total = 0;\n        foreach (int num in numbers) {\n            total += num;\n        }\n        return total;\n    }\n}\n`,
    b: `// C# Solution B (Renamed variables)\nusing System;\n\npublic class Program {\n    public static int GetTotal(int[] values) {\n        int result = 0;\n        foreach (int item in values) {\n            result += item;\n        }\n        return result;\n    }\n}\n`,
  },
};

export default function AlgorithmDemo() {
  const [language, setLanguage] = useState('python');
  const [codeA, setCodeA] = useState(PRESETS.python.a);
  const [codeB, setCodeB] = useState(PRESETS.python.b);
  const [k, setK] = useState(5);
  const [windowSize, setWindowSize] = useState(4);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    if (PRESETS[lang]) {
      setCodeA(PRESETS[lang].a);
      setCodeB(PRESETS[lang].b);
    }
  };

  const handleRunDemo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/demo/algorithm', {
        codeA,
        codeB,
        language,
        k: Number(k),
        windowSize: Number(windowSize),
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Algorithm demo failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container fade-in" style={{ maxWidth: '1600px' }}>
      <div className="page-header">
        <h1 className="page-title">Unified Multi-Language Pipeline Visualizer</h1>
        <p className="page-subtitle">
          Demonstrating Language Detector → Token Normalization → K-Grams → Rolling Hash → Winnowing for 6 Programming Languages.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="glass-card" style={{ marginBottom: '24px', display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label" style={{ margin: 0 }}>Target Language</label>
          <select className="form-select" style={{ padding: '6px 12px' }} value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="c">C</option>
            <option value="csharp">C#</option>
            <option value="auto">Auto Detect</option>
          </select>
        </div>

        <div>
          <label className="form-label" style={{ margin: 0 }}>K-Gram Size (k)</label>
          <input type="number" className="form-input" style={{ width: '80px', padding: '6px 12px' }} value={k} onChange={(e) => setK(Number(e.target.value))} min={1} max={20} />
        </div>

        <div>
          <label className="form-label" style={{ margin: 0 }}>Window Size (w)</label>
          <input type="number" className="form-input" style={{ width: '80px', padding: '6px 12px' }} value={windowSize} onChange={(e) => setWindowSize(Number(e.target.value))} min={1} max={20} />
        </div>

        <button onClick={handleRunDemo} className="btn btn-primary" disabled={loading} style={{ marginLeft: 'auto' }}>
          {loading ? 'Running Algorithm...' : '▶ Run Pipeline Analysis'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Code Snippet A</h3>
          <div style={{ border: '1px solid var(--cg-border)', borderRadius: '8px', overflow: 'hidden', height: '260px' }}>
            <Editor height="100%" language={language === 'csharp' ? 'csharp' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language} theme="vs-dark" value={codeA} onChange={(v) => setCodeA(v || '')} options={{ fontSize: 13, minimap: { enabled: false } }} />
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>Code Snippet B</h3>
          <div style={{ border: '1px solid var(--cg-border)', borderRadius: '8px', overflow: 'hidden', height: '260px' }}>
            <Editor height="100%" language={language === 'csharp' ? 'csharp' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language} theme="vs-dark" value={codeB} onChange={(v) => setCodeB(v || '')} options={{ fontSize: 13, minimap: { enabled: false } }} />
          </div>
        </div>
      </div>

      {result && (
        <div className="slide-up">
          <div className="glass-card" style={{ marginBottom: '24px', borderColor: 'var(--cg-primary)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', color: 'var(--cg-primary-light)' }}>
              Unified Pipeline Execution Results
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)' }}>Fingerprint Jaccard Similarity</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cg-accent)' }}>
                  {(result.similarity.rawScore * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)' }}>Matched Hashes</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  {result.similarity.matchedCount} / {Math.max(result.submissionA.fingerprintCount, result.submissionB.fingerprintCount)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)' }}>Snippet A Fingerprints</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{result.submissionA.fingerprintCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--cg-text-muted)' }}>Snippet B Fingerprints</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800 }}>{result.submissionB.fingerprintCount}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>
                Normalized Token Stream A ({result.submissionA.tokens.length} tokens)
              </h3>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                background: 'var(--cg-bg)',
                padding: '12px',
                borderRadius: '8px',
                height: '140px',
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
              }}>
                {result.submissionA.tokens.map((t, i) => (
                  <span key={i} style={{ padding: '2px 6px', borderRadius: '4px', background: t.type === 'VAR' ? 'rgba(99, 102, 241, 0.2)' : 'var(--cg-bg-elevated)', color: t.type === 'VAR' ? 'var(--cg-primary-light)' : 'var(--cg-text)' }}>
                    {t.type}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '8px' }}>
                Normalized Token Stream B ({result.submissionB.tokens.length} tokens)
              </h3>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                background: 'var(--cg-bg)',
                padding: '12px',
                borderRadius: '8px',
                height: '140px',
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
              }}>
                {result.submissionB.tokens.map((t, i) => (
                  <span key={i} style={{ padding: '2px 6px', borderRadius: '4px', background: t.type === 'VAR' ? 'rgba(99, 102, 241, 0.2)' : 'var(--cg-bg-elevated)', color: t.type === 'VAR' ? 'var(--cg-primary-light)' : 'var(--cg-text)' }}>
                    {t.type}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
              Selected Winnowing Fingerprints & Overlap
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginBottom: '8px' }}>Snippet A Fingerprint Hashes</h4>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.submissionA.fingerprints.map((fp, i) => {
                    const isMatched = result.similarity.intersection.includes(fp.hash);
                    return (
                      <span key={i} style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isMatched ? 'rgba(16, 185, 129, 0.2)' : 'var(--cg-bg)',
                        border: isMatched ? '1px solid #10b981' : '1px solid var(--cg-border)',
                        color: isMatched ? '#10b981' : 'var(--cg-text-muted)',
                      }}>
                        #{fp.hash} (pos {fp.position})
                      </span>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--cg-text-muted)', marginBottom: '8px' }}>Snippet B Fingerprint Hashes</h4>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {result.submissionB.fingerprints.map((fp, i) => {
                    const isMatched = result.similarity.intersection.includes(fp.hash);
                    return (
                      <span key={i} style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isMatched ? 'rgba(16, 185, 129, 0.2)' : 'var(--cg-bg)',
                        border: isMatched ? '1px solid #10b981' : '1px solid var(--cg-border)',
                        color: isMatched ? '#10b981' : 'var(--cg-text-muted)',
                      }}>
                        #{fp.hash} (pos {fp.position})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
              Generated Explanation Report
            </h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {result.explanation.map((exp, i) => (
                <li key={i} style={{ padding: '8px 12px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '6px', marginBottom: '6px', fontSize: '0.85rem' }}>
                  • {exp}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
