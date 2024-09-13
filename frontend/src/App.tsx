import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivateRoute from '@/components/PrivateRoute';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const CountryPage = lazy(() => import('@/pages/CountryPage'));
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const UserProfilePage = lazy(() => import('@/pages/UserProfilePage'));
const VerifyEmailPage = lazy(() => import('@/pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'));

const AppContent: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  React.useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      if ((event as CustomEvent).detail === 'UNAUTHORIZED') {
        logout();
      }
    };

    window.addEventListener('unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [logout]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
              <Route path="/register" element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} />
              <Route path="/" element={<PrivateRoute element={<Dashboard />} />} />
              <Route path="/country/:country" element={<PrivateRoute element={<CountryPage />} />} />
              <Route path="/profile" element={<PrivateRoute element={<UserProfilePage />} />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
          </Suspense>
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