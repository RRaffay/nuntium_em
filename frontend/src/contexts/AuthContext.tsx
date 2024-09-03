import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '../services/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (first_name: string, last_name: string, email: string, password: string, area_of_interest: string) => Promise<void>;
  logout: () => void;
  getDashboardHeader: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = auth.getToken();
      if (token) {
        try {
          await auth.getDashboardHeader(); 
          setIsAuthenticated(true);
        } catch (error) {
          setIsAuthenticated(false);
          auth.logout();
        }
      } else {
        setIsAuthenticated(false);
      }
    };
  
    checkAuth();
  }, []);

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

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, register, logout, getDashboardHeader }}>
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
