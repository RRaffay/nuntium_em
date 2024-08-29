import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import CountryPage from '@/pages/CountryPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivateRoute from '@/components/PrivateRoute';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
            <Route path="/" element={<PrivateRoute element={<Dashboard />} />} />
            <Route path="/country/:country" element={<PrivateRoute element={<CountryPage />} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;