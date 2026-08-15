import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfessorDashboard from './pages/ProfessorDashboard.jsx';
import SimilarityResults from './pages/SimilarityResults.jsx';
import ComparisonView from './pages/ComparisonView.jsx';
import AlgorithmDemo from './pages/AlgorithmDemo.jsx';
import StudentPortal from './pages/StudentPortal.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StudentAssignmentPage from './pages/StudentAssignmentPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div style={{ minHeight: '100vh', background: 'var(--cg-bg)' }}>
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/demo" element={<AlgorithmDemo />} />
            <Route path="/submit" element={<StudentPortal />} />
            <Route path="/submit/:code" element={<StudentPortal />} />

            {/* Faculty Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['faculty', 'professor']} />}>
              <Route path="/dashboard" element={<ProfessorDashboard />} />
              <Route path="/faculty" element={<ProfessorDashboard />} />
              <Route path="/professor" element={<ProfessorDashboard />} />
              <Route path="/assignments/:id/results" element={<SimilarityResults />} />
              <Route path="/results/:id" element={<ComparisonView />} />
            </Route>

            {/* Student Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/assignments/:assignmentId" element={<StudentAssignmentPage />} />
            </Route>

            <Route path="*" element={<LandingPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
