import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

            {/* Faculty Only Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/faculty" element={<ProfessorDashboard />} />
              <Route path="/professor" element={<ProfessorDashboard />} />
              <Route path="/assignments/:id/results" element={<SimilarityResults />} />
              <Route path="/results/:id" element={<ComparisonView />} />
            </Route>

            <Route path="*" element={<LandingPage />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
