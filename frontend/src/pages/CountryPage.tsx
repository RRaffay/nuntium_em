import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCountryData } from '@/hooks/useCountryData';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { EventList } from '@/components/EventList';
import { LowRelevanceEvents } from '@/components/LowRelevanceEvents';
import { CountryPageHeader } from '@/components/CountryPageHeader';
import { CountryPageAlertDialog } from '@/components/CountryPageAlertDialog';
import { Event as ApiEvent } from '@/services/api';

const CountryPage: React.FC = () => {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const { countryData, userProfile, error } = useCountryData(country);
  const {
    countryReport,
    eventReports,
    handleGenerateCountryReport,
    handleGenerateEventReport,
    isGeneratingCountryReport,
    isGeneratingEventReport,
    countryReportProgress,
    eventReportProgress,
    countryReportError,
    eventReportErrors,
    rateLimitError,
    isAnyReportGenerating,
    showAlertDialog,
    setShowAlertDialog,
  } = useReportGeneration(country);

  const [showLowRelevanceEvents, setShowLowRelevanceEvents] = useState(false);

  const handleBackToDashboard = () => {
    navigate('/');
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!countryData) {
    return <div>Loading...</div>;
  }

  const { highRelevanceEvents, lowRelevanceEvents } = getFilteredEvents(countryData.events);

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <CountryPageHeader
        countryData={countryData}
        userProfile={userProfile}
        onGenerateReport={handleGenerateCountryReport}
        onBackToDashboard={handleBackToDashboard}
        countryReport={countryReport}
        isGeneratingCountryReport={isGeneratingCountryReport}
        countryReportProgress={countryReportProgress}
        countryReportError={countryReportError}
        isAnyReportGenerating={isAnyReportGenerating}
      />
      <br/>
      {highRelevanceEvents.length > 0 ? (
        <EventList
          events={highRelevanceEvents}
          eventReports={eventReports}
          isGeneratingEventReport={isGeneratingEventReport}
          eventReportProgress={eventReportProgress}
          eventReportErrors={eventReportErrors}
          onGenerateEventReport={handleGenerateEventReport}
          isAnyReportGenerating={isAnyReportGenerating}
        />
      ) : (
        <div className="text-center py-4">
          <p>No highly relevant events found for this country.</p>
          {lowRelevanceEvents.length > 0 && (
            <p>You can still view events with lower relevance scores below.</p>
          )}
        </div>
      )}

      {lowRelevanceEvents.length > 0 && (
        <LowRelevanceEvents
          events={lowRelevanceEvents}
          showLowRelevanceEvents={showLowRelevanceEvents}
          setShowLowRelevanceEvents={setShowLowRelevanceEvents}
          eventReports={eventReports}
          isGeneratingEventReport={isGeneratingEventReport}
          eventReportProgress={eventReportProgress}
          eventReportErrors={eventReportErrors}
          onGenerateEventReport={handleGenerateEventReport}
          isAnyReportGenerating={isAnyReportGenerating}
        />
      )}

      {rateLimitError && (
        <div className="p-2 bg-red-100 text-red-700 mb-4">
          {rateLimitError}
        </div>
      )}

      <CountryPageAlertDialog
        isOpen={showAlertDialog}
        onClose={() => setShowAlertDialog(false)}
        title="Report Generation in Progress"
        message="Please wait for the current report to finish generating before starting a new one."
      />
    </div>
  );
};

const getFilteredEvents = (events: ApiEvent[]) => {
  const highRelevanceEvents = events.filter(event => event.relevance_score >= 4);
  const lowRelevanceEvents = events.filter(event => event.relevance_score < 4);
  
  return {
    highRelevanceEvents: highRelevanceEvents.sort((a, b) => b.relevance_score - a.relevance_score),
    lowRelevanceEvents: lowRelevanceEvents.sort((a, b) => b.relevance_score - a.relevance_score)
  };
};

export default CountryPage;