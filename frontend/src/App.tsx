import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import PrivateRoute from '@/components/PrivateRoute';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import Joyride, { CallBackProps, STATUS, Step, EVENTS, Placement } from 'react-joyride';
import { TourProvider } from '@/contexts/TourContext';
import { useTour } from '@/contexts/TourContext';

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
        <div className="max-w-8xl mx-auto py-6 sm:px-6 lg:px-8">
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
  const [runTutorial, setRunTutorial] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const {
    currentStep,
    setCurrentStep,
    setIsChatOpen,
    setCurrentTourType,
    isWaitingForCharts,
    setIsWaitingForCharts,
  } = useTour();

  useEffect(() => {
    const handleStartTutorial = (event: CustomEvent) => {
      const { component } = event.detail;
      let newSteps: Step[] = [];

      setCurrentTourType(component);

      if (component === 'All' || component === 'Dashboard') {
        newSteps = [
          {
            target: 'body',
            content: 'Welcome to Nuntium! Let\'s take a quick tour of the application.',
            placement: 'center' as Placement,
          },
          {
            target: '[data-testid="add-country-button"]',
            content: 'Click here to add a new country to your dashboard.',
          },
          {
            target: '[data-testid="country-card"]',
            content: 'These cards show information about each country you\'re tracking.',
          },
        ];
      }

      if (component === 'All' || component === 'CountryPage') {
        newSteps = [
          ...newSteps,
          {
            target: '[data-testid="country-page-header"]',
            content: 'This header shows key information about the selected country.',
          },
          {
            target: '[data-testid="generate-open-research-report-button"]',
            content: 'Click here to generate a custom research report.',
          },
          {
            target: '[data-testid="edit-area-of-interest-input"]',
            content: 'Click here to edit your area of interest.',
          },
          {
            target: '[data-testid="toggle-view-mode"]',
            content: 'Switch between Events, Indicators, or Both views here.',
          },
          {
            target: '[data-testid="events-section"]',
            content: 'Here you can view and analyze events related to the country.',
          },
          {
            target: '[data-testid="event-accordion-item"] button',
            content: 'Click here to expand an event and see more details.',
          },
          {
            target: '[data-testid="event-accordion-item"] [data-testid="article-dialog-button"]',
            content: 'This button opens a dialog with the full article text.',
          },
          {
            target: '[data-testid="event-accordion-item"] [data-testid="report-dialog-button"]',
            content: 'Click here to generate or view a report for this event.',
          },
          {
            target: '[data-testid="fetch-new-events-button"]',
            content: 'Click here to fetch new events for this country.',
          },
          {
            target: '[data-testid="toggle-view-mode"]',
            content: 'Switch to the Indicators view.',
          },
          {
            target: '[data-testid="economic-indicators-chart"]',
            content: 'This view shows economic indicators for the country.',
          },
          {
            target: '[data-testid="display-mode-switch"]',
            content: 'Toggle between single and multiple chart views.',
          },
          {
            target: '[data-testid="metric-selector"]',
            content: 'Select different metrics to display on the chart.',
          },
          {
            target: '[data-testid="chat-button"]',
            content: 'Click here to open the chat interface.',
          },
          {
            target: '[data-testid="pro-mode-switch"]',
            content: 'Toggle Pro Mode for more detailed responses.',
          },
          {
            target: '[data-testid="chat-input"]',
            content: 'Type your questions about the data here.',
          },
          {
            target: '[data-testid="send-button"]',
            content: 'Click to send your question and get an AI-generated response.',
          },
          {
            target: '[data-testid="clear-chat-button"]',
            content: 'Clear the chat history when you\'re done.',
          },
        ];
      }

      setSteps(newSteps);
      setRunTutorial(true);
    };

    window.addEventListener('startTutorial', handleStartTutorial as EventListener);

    return () => {
      window.removeEventListener('startTutorial', handleStartTutorial as EventListener);
    };
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, index, type } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunTutorial(false);
      localStorage.setItem('hasSeenTutorial', 'true');
      setIsChatOpen(false);
    } else {
      setCurrentStep(index);
      if (type === EVENTS.STEP_BEFORE || type === EVENTS.TARGET_NOT_FOUND) {
        // Update component states based on current step
        switch (index) {
          case 5:
            // Open the first event accordion
            const firstAccordionTrigger = document.querySelector('[data-testid="event-accordion-item"] button');
            if (firstAccordionTrigger instanceof HTMLElement) {
              firstAccordionTrigger.click();
            }
            break;
          case 9:
            setIsWaitingForCharts(true);
            const chartsToggle = document.querySelector('[aria-label="Toggle charts view"]');
            if (chartsToggle instanceof HTMLElement) {
              chartsToggle.click();
              console.log('chartsToggle clicked');
            }
            setIsWaitingForCharts(false);
            // Don't proceed to the next step here
            break; // Exit the switch statement\
          case 13: // Assuming this is the index for the chat button step
            setIsChatOpen(true);
            break;
          default:
            // Don't close the chat for the new chat-related steps
            if (index < 13 || index > 17) {
              setIsChatOpen(false);
            }
            break;
        }
      }
    }
  };

  return (
    <AuthProvider>
      <TourProvider>
        <Router>
          <Joyride
            steps={steps}
            run={runTutorial && !isWaitingForCharts}
            continuous
            showSkipButton
            showProgress
            callback={handleJoyrideCallback}
            disableOverlayClose
            disableCloseOnEsc
          />
          <AppContent />
        </Router>
      </TourProvider>
    </AuthProvider>
  );
};

export default App;