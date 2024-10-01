import React, { createContext, useState, useContext, ReactNode } from 'react';

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
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [currentTourType, setCurrentTourType] = useState<'All' | 'Dashboard' | 'CountryPage' | null>(null);
    const [isWaitingForCharts, setIsWaitingForCharts] = useState(false);

    const startTour = (type: 'All' | 'Dashboard' | 'CountryPage') => {
        setCurrentTourType(type);
        setCurrentStep(0);
        const event = new CustomEvent('startTutorial', { detail: { component: type } });
        window.dispatchEvent(event);
    };

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