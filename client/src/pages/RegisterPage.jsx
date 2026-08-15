import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import CodeShieldLogo from '../components/CodeShieldLogo.jsx';

export default function RegisterPage() {
  const [role, setRole] = useState('faculty');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Student Academic Profile
  const [department, setDepartment] = useState('CSE');
  const [division, setDivision] = useState('D3');
  const [batch, setBatch] = useState('2023');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await register(
        name,
        email,
        password,
        role,
        role === 'student' ? studentId : undefined,
        role === 'student' ? department : undefined,
        role === 'student' ? division : undefined,
        role === 'student' ? batch : undefined
      );
      if (user?.role === 'student') {
        navigate('/student/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details?.[0]?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 64px)', padding: '24px' }}>
      <div className="glass-card slide-up" style={{ width: '100%', maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <CodeShieldLogo size={42} showText={true} textColor="#ffffff" />
        </div>
        <p style={{ color: 'var(--cg-text-muted)', fontSize: '0.875rem', textAlign: 'center', marginBottom: '20px' }}>
          Select your account role to get started
        </p>

        {/* Role Toggle */}
        <div style={{ display: 'flex', gap: '8px', background: 'rgba(15, 23, 42, 0.6)', padding: '4px', borderRadius: '10px', marginBottom: '20px' }}>
          <button
            type="button"
            className={`btn btn-sm ${role === 'faculty' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setRole('faculty')}
          >
            Faculty Account
          </button>
          <button
            type="button"
            className={`btn btn-sm ${role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setRole('student')}
          >
            Student Account
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={role === 'student' ? 'e.g. Rahul Sharma' : 'e.g. Dr. Jane Doe'}
            />
          </div>

          {role === 'student' && (
            <>
              <div className="form-group">
                <label className="form-label">Student ID / Roll Number *</label>
                <input
                  type="text"
                  className="form-input"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                  placeholder="e.g. 21CS001"
                />
              </div>

              {/* Academic Group Selection */}
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '14px', borderRadius: '10px', marginBottom: '16px', border: '1px solid var(--cg-border)' }}>
                <label className="form-label" style={{ color: 'var(--cg-accent)', fontWeight: 700, marginBottom: '8px' }}>
                  Academic Profile Group *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Dept</label>
                    <select className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                      <option value="CSE">CSE</option>
                      <option value="IT">IT</option>
                      <option value="ECE">ECE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Division</label>
                    <select className="form-input" value={division} onChange={(e) => setDivision(e.target.value)}>
                      <option value="D1">D1</option>
                      <option value="D2">D2</option>
                      <option value="D3">D3</option>
                      <option value="D4">D4</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Batch</label>
                    <select className="form-input" value={batch} onChange={(e) => setBatch(e.target.value)}>
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--cg-text-muted)' }}>
                  Selected Group: <strong style={{ color: '#fff' }}>{department} / {division} / {batch}</strong>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">{role === 'student' ? 'Student Email *' : 'Faculty Email *'}</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={role === 'student' ? 'rahul@example.com' : 'faculty@university.edu'}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '8px', padding: '10px' }}
          >
            {loading ? 'Creating Account...' : `Register as ${role === 'student' ? 'Student' : 'Faculty'}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.85rem', color: 'var(--cg-text-muted)' }}>
          Already have an account? <Link to="/login">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
