import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import Dashboard from '../pages/Dashboard';
import { api } from '@/services/api';
import { TourProvider } from '@/contexts/TourContext';

jest.mock('@/services/api', () => ({
    api: {
        getCountries: jest.fn(),
        getAddableCountries: jest.fn(),
        runCountryPipeline: jest.fn(),
        deleteCountry: jest.fn().mockResolvedValue(undefined),
    },
}));

jest.mock('@/contexts/AuthContext', () => ({
    ...jest.requireActual('@/contexts/AuthContext'),
    useAuth: () => ({
        getDashboardHeader: jest.fn().mockResolvedValue('Welcome to Dashboard'),
        isVerified: true,
        checkVerificationStatus: jest.fn(),
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

describe('Dashboard', () => {
    beforeEach(() => {
        (api.getCountries as jest.Mock).mockResolvedValue([
            { name: 'USA', timestamp: '2023-06-01', hours: 24, no_relevant_events: 10 },
        ]);
        (api.getAddableCountries as jest.Mock).mockResolvedValue(['Canada', 'UK']);
    });

    it('renders dashboard with country list', async () => {
        render(
            <AuthProvider>
                <TourProvider>
                    <MemoryRouter>
                        <Dashboard />
                    </MemoryRouter>
                </TourProvider>
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('Welcome to Dashboard')).toBeInTheDocument();
            expect(screen.getByText('USA')).toBeInTheDocument();
        });
    });

    it('opens add country dialog', async () => {
        render(
            <AuthProvider>
                <TourProvider>
                    <MemoryRouter>
                        <Dashboard />
                    </MemoryRouter>
                </TourProvider>
            </AuthProvider>
        );

        await waitFor(() => {
            fireEvent.click(screen.getByText('Add Country'));
        });

        expect(screen.getByText('Add a New Country')).toBeInTheDocument();
    });

    it('deletes a country', async () => {
        window.confirm = jest.fn(() => true);

        render(
            <AuthProvider>
                <TourProvider>
                    <MemoryRouter>
                        <Dashboard />
                    </MemoryRouter>
                </TourProvider>
            </AuthProvider>
        );

        await waitFor(() => {
            const deleteButton = screen.getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);
        });

        await waitFor(() => {
            expect(api.deleteCountry).toHaveBeenCalledWith('USA');
        });
    });
});