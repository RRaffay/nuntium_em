import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/Header';
import { AuthProvider } from '@/contexts/AuthContext';

jest.mock('@/contexts/AuthContext', () => ({
    ...jest.requireActual('@/contexts/AuthContext'),
    useAuth: () => ({
        isAuthenticated: true,
        logout: jest.fn(),
    }),
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


describe('Header', () => {
    it('renders header when authenticated', () => {
        render(
            <AuthProvider>
                <MemoryRouter>
                    <Header />
                </MemoryRouter>
            </AuthProvider>
        );

        expect(screen.getByText('Nuntium')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('calls logout function when logout button is clicked', () => {
        const mockLogout = jest.fn();
        jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockImplementation(() => ({
            isAuthenticated: true,
            logout: mockLogout,
        }));

        render(
            <AuthProvider>
                <MemoryRouter>
                    <Header />
                </MemoryRouter>
            </AuthProvider>
        );

        fireEvent.click(screen.getByText('Logout'));
        expect(mockLogout).toHaveBeenCalled();
    });
});