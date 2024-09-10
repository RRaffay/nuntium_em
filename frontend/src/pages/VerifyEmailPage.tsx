import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { verifyEmail } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');

      if (token) {
        try {
          await verifyEmail(token);
          setVerificationStatus('success');
          setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
          setVerificationStatus('error');
          setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
        }
      } else {
        setVerificationStatus('error');
        setErrorMessage('No verification token provided');
      }
    };

    verifyToken();
  }, [location, verifyEmail, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {verificationStatus === 'verifying' && (
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verifying your email...</h2>
          </div>
        )}
        {verificationStatus === 'success' && (
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Email verified successfully!</h2>
            <p className="mt-2 text-sm text-gray-600">Redirecting to login page...</p>
          </div>
        )}
        {verificationStatus === 'error' && (
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Email verification failed</h2>
            <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
            <p className="mt-2 text-sm text-gray-600">Please try again or contact support.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;