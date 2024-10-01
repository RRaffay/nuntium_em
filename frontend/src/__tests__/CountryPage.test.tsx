// CountryPage.test.tsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CountryPage from '../pages/CountryPage';
import { AuthProvider } from '@/contexts/AuthContext';
import userEvent from '@testing-library/user-event';
import { TourProvider } from '@/contexts/TourContext';

// Mock the hooks
jest.mock('@/hooks/useCountryData', () => ({
    useCountryData: jest.fn(),
}));
jest.mock('@/hooks/useMetricsData', () => ({
    useMetricsData: jest.fn(),
}));
jest.mock('@/hooks/useReportGeneration', () => ({
    useReportGeneration: jest.fn(),
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

// Mock the api module
jest.mock('@/services/api', () => ({
    api: {
        getCountryData: jest.fn(),
        getUserProfile: jest.fn(),
        getCountryMetrics: jest.fn(),
        generateCountryReport: jest.fn(),
        generateEventReport: jest.fn(),
        // Add other methods if needed
    },
}));

// Import the hooks and api
import { useCountryData } from '@/hooks/useCountryData';
import { useMetricsData } from '@/hooks/useMetricsData';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { api } from '@/services/api';

// Mock components that might cause issues
jest.mock('@/components/EconomicIndicatorsChart', () => ({
    EconomicIndicatorsChart: () => (
        <div data-testid="economic-indicators-chart">Mocked EconomicIndicatorsChart</div>
    ),
}));
jest.mock('@/components/EventList', () => ({
    EventList: ({ events }: { events: any[] }) => (
        <div data-testid="event-list">
            {events.map((event) => (
                <div key={event.id}>{event.title}</div>
            ))}
        </div>
    ),
}));

// Mock MarkdownContent
jest.mock('@/components/MarkdownContent', () => ({
    MarkdownContent: ({ content }: { content: string }) => (
        <div data-testid="markdown-content">{content}</div>
    ),
}));

// Mock window.matchMedia for testing components that use it
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

beforeEach(() => {
    jest.clearAllMocks();

    // Mock the api methods
    (api.getCountryData as jest.Mock).mockResolvedValue({
        country: 'USA',
        events: [
            {
                id: '1',
                title: 'Event 1',
                relevance_score: 5,
                event_summary: 'Summary of Event 1',
                relevance_rationale: 'Rationale for Event 1',
                articles: [],
            },
            {
                id: '2',
                title: 'Event 2',
                relevance_score: 3,
                event_summary: 'Summary of Event 2',
                relevance_rationale: 'Rationale for Event 2',
                articles: [],
            },
        ],
        timestamp: '2023-06-01T00:00:00Z',
        hours: 24,
        no_relevant_events: 2,
    });

    (api.getUserProfile as jest.Mock).mockResolvedValue({
        first_name: 'John',
        last_name: 'Doe',
        area_of_interest: 'Politics',
        country_interests: { USA: 'Politics' },
        email: 'john.doe@example.com',
        is_verified: true,
    });

    (api.getCountryMetrics as jest.Mock).mockResolvedValue({
        gdp: {
            label: 'GDP',
            data: [{ date: '2023-01-01', value: 1000 }],
            unit: 'USD',
            source: 'World Bank',
            description: 'Gross Domestic Product',
        },
        // Add more metrics if needed
    });

    // Mock the useCountryData hook
    (useCountryData as jest.Mock).mockReturnValue({
        countryData: {
            country: 'USA',
            events: [
                { id: '1', title: 'Event 1', relevance_score: 5 },
                { id: '2', title: 'Event 2', relevance_score: 3 },
            ],
            timestamp: '2023-06-01T00:00:00Z',
            hours: 24,
            no_relevant_events: 2,
        },
        userProfile: { country_interests: { USA: 'Politics' } },
        error: null,
        isUpdating: false,
        updateCountryData: jest.fn(),
        updateProgress: 0,
        updateCountryInterest: jest.fn(),
    });

    // Mock the useMetricsData hook
    (useMetricsData as jest.Mock).mockReturnValue({
        metrics: {
            gdp: {
                label: 'GDP',
                data: [{ date: '2023-01-01', value: 1000 }],
                unit: 'USD',
                source: 'World Bank',
                description: 'Gross Domestic Product',
            },
        },
        loading: false,
        error: null,
        availableMetrics: ['gdp'],
        latestDates: { gdp: '2023-01-01' },
        metricsCount: 1,
    });

    // Mock the useReportGeneration hook
    (useReportGeneration as jest.Mock).mockReturnValue({
        countryReport: null,
        eventReports: {},
        handleGenerateCountryReport: jest.fn(),
        handleGenerateEventReport: jest.fn(),
        isGeneratingCountryReport: false,
        isGeneratingEventReport: {},
        countryReportProgress: 0,
        eventReportProgress: {},
        countryReportError: null,
        eventReportErrors: {},
        rateLimitError: null,
        isAnyReportGenerating: false,
        showAlertDialog: false,
        setShowAlertDialog: jest.fn(),
    });
});

describe('CountryPage', () => {
    it('renders country page with events and economic indicators', async () => {
        await act(async () => {
            render(
                <AuthProvider>
                    <MemoryRouter initialEntries={['/country/USA']}>
                        <Routes>
                            <Route path="/country/:country" element={<CountryPage />} />
                        </Routes>
                    </MemoryRouter>
                </AuthProvider>
            );
        });

        // Wait for the page to render
        await waitFor(() => {
            expect(screen.getByText('USA')).toBeInTheDocument();
        });

        // Simulate clicking on the "Both" toggle button to change the viewMode
        userEvent.click(screen.getByRole('radio', { name: /Toggle both views/i }));

        // Now proceed with your assertions
        await waitFor(() => {
            expect(screen.getByTestId('event-list')).toBeInTheDocument();
            expect(screen.getByTestId('economic-indicators-chart')).toBeInTheDocument();
            expect(screen.getByText('Generate Open Research Report')).toBeInTheDocument();
        });
    }, 15000);
});