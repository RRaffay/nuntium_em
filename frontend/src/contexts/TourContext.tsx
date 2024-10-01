import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { Step, CallBackProps, STATUS, EVENTS } from 'react-joyride';

interface TourContextType {
    currentStep: number;
    setCurrentStep: (step: number) => void;
    isChatOpen: boolean;
    setIsChatOpen: (isOpen: boolean) => void;
    currentTourType: 'All' | 'Dashboard' | 'CountryPage' | null;
    setCurrentTourType: (type: 'All' | 'Dashboard' | 'CountryPage' | null) => void;
    startTour: (type: 'All' | 'Dashboard' | 'CountryPage') => void;
    isWaitingForCharts: boolean;
    setIsWaitingForCharts: (isWaiting: boolean) => void;
    steps: Step[];
    setSteps: (steps: Step[]) => void;
    runTour: boolean;
    setRunTour: (run: boolean) => void;
    handleJoyrideCallback: (data: CallBackProps) => void;
    autoStartTour: boolean;
    setAutoStartTour: (autoStart: boolean) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [currentTourType, setCurrentTourType] = useState<'All' | 'Dashboard' | 'CountryPage' | null>(null);
    const [isWaitingForCharts, setIsWaitingForCharts] = useState(false);
    const [steps, setSteps] = useState<Step[]>([]);
    const [runTour, setRunTour] = useState(false);
    const [autoStartTour, setAutoStartTour] = useState(false);

    const startTour = useCallback((type: 'All' | 'Dashboard' | 'CountryPage') => {
        setCurrentTourType(type);
        setCurrentStep(0);
        setRunTour(true);
        const event = new CustomEvent('startTutorial', { detail: { component: type } });
        window.dispatchEvent(event);
    }, []);

    const handleJoyrideCallback = useCallback((data: CallBackProps) => {
        const { status, index, type } = data;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            setRunTour(false);
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
                        }
                        setIsWaitingForCharts(false);
                        break;
                    case 13:
                        setIsChatOpen(true);
                        break;
                    default:
                        if (index < 13 || index > 17) {
                            setIsChatOpen(false);
                        }
                        break;
                }
            }
        }
    }, []);

    return (
        <TourContext.Provider
            value={{
                currentStep,
                setCurrentStep,
                isChatOpen,
                setIsChatOpen,
                currentTourType,
                setCurrentTourType,
                startTour,
                isWaitingForCharts,
                setIsWaitingForCharts,
                steps,
                setSteps,
                runTour,
                setRunTour,
                handleJoyrideCallback,
                autoStartTour,
                setAutoStartTour,
            }}
        >
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};