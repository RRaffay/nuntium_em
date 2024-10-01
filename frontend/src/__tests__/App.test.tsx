import React from 'react';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '@/contexts/AuthContext';
import App from '../App';
import { useLocation } from 'react-router-dom';
import { api } from '@/services/api';
import { auth } from '@/services/auth';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  ...jest.requireActual('@/contexts/AuthContext'),
  useAuth: () => ({
    isAuthenticated: true,
    logout: jest.fn(),
  }),
}));

jest.mock('@/services/api', () => ({
  api: {
    getCountries: jest.fn(),
    getUserProfile: jest.fn(),
    // Add more mocked API methods as needed
  },
}));

jest.mock('@/services/auth', () => ({
  auth: {
    getToken: jest.fn(),
    getDashboardHeader: jest.fn(),
    getUserProfile: jest.fn(),
    // Add more mocked auth methods as needed
  },
}));

// Mock the TourContext
jest.mock('@/contexts/TourContext', () => ({
  ...jest.requireActual('@/contexts/TourContext'),
  useTour: () => ({
    startTour: jest.fn(),
    currentStep: 0,
    isWaitingForCharts: false,
    setIsWaitingForCharts: jest.fn(),
    setSteps: jest.fn(),
    // Add any other tour-related properties or functions you need for testing
  }),
  TourProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));


describe('App', () => {
  beforeEach(() => {
    (useLocation as jest.Mock).mockReturnValue({ pathname: '/' });
    (api.getCountries as jest.Mock).mockResolvedValue([]);
    (api.getUserProfile as jest.Mock).mockResolvedValue({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      is_verified: true,
      area_of_interest: 'Technology',
    });
    (auth.getToken as jest.Mock).mockReturnValue('mock-token');
    (auth.getDashboardHeader as jest.Mock).mockResolvedValue('Welcome to the dashboard');
    (auth.getUserProfile as jest.Mock).mockResolvedValue({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      is_verified: true,
      area_of_interest: 'Technology',
    });
  });

  it('renders without crashing', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders Header when authenticated', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );
    expect(screen.getByText('Nuntium')).toBeInTheDocument();
  });

});