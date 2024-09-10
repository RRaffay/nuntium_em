import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth, UserProfile } from '@/services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  isVerified: boolean; // Add this line
  login: (username: string, password: string) => Promise<void>;
  register: (first_name: string, last_name: string, email: string, password: string, area_of_interest: string) => Promise<void>;
  logout: () => void;
  getDashboardHeader: () => Promise<string>;
  verifyEmail: (token: string) => Promise<void>;
  checkVerificationStatus: () => Promise<void>; // Add this line
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false); // Add this line

  useEffect(() => {
    const checkAuth = async () => {
      const token = auth.getToken();
      if (token) {
        try {
          await auth.getDashboardHeader();
          setIsAuthenticated(true);
          await checkVerificationStatus(); // Add this line
        } catch (error) {
          setIsAuthenticated(false);
          setIsVerified(false); // Add this line
          auth.logout();
        }
      } else {
        setIsAuthenticated(false);
        setIsVerified(false); // Add this line
      }
    };

    checkAuth();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const userProfile: UserProfile = await auth.getUserProfile();
      setIsVerified(userProfile.is_verified);
    } catch (error) {
      console.error('Failed to check verification status:', error);
    }
  };

  const login = async (username: string, password: string) => {
    await auth.login({ username, password });
    setIsAuthenticated(true);
  };

  const register = async (first_name: string, last_name: string, email: string, password: string, area_of_interest: string) => {
    await auth.register({ first_name, last_name, email, password, area_of_interest });
  };

  const logout = () => {
    auth.logout();
    setIsAuthenticated(false);
  };

  const getDashboardHeader = async () => {
    return auth.getDashboardHeader();
  };

  const verifyEmail = async (token: string) => {
    await auth.verifyEmail(token);
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      isVerified, // Add this line
      login, 
      register, 
      logout, 
      getDashboardHeader, 
      verifyEmail,
      checkVerificationStatus // Add this line
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
