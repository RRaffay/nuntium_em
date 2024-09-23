import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCountryData } from '@/hooks/useCountryData';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { EconomicIndicatorsChart } from '@/components/EconomicIndicatorsChart';
import { EventList } from '@/components/EventList';
import { LowRelevanceEvents } from '@/components/LowRelevanceEvents';
import { CountryPageHeader } from '@/components/CountryPageHeader';
import { CountryPageAlertDialog } from '@/components/CountryPageAlertDialog';
import { Event as ApiEvent } from '@/services/api';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { BarChart, LineChart, LayoutPanelLeft } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<string>("events");

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

  const renderEventsSection = () => {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4">Events</h2>
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
      </div>
    );
  };

  const renderChartsSection = () => {
    return (
      <div className="w-full">
        <h2 className="text-2xl font-bold mb-4">Economic Indicators</h2>
        <EconomicIndicatorsChart
          country={country!}
          enableChat={viewMode === "charts"} // Pass this prop to EconomicIndicatorsChart
        />
      </div>
    );
  };

  return (
    <div className="p-4 md:p-2 lg:p-4">

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
      <br />
      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)} className="justify-center">
        <ToggleGroupItem
          value="events"
          aria-label="Toggle events view"
          className={`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`}
        >
          <BarChart className="h-4 w-4 mr-2" />
          Events
        </ToggleGroupItem>
        <ToggleGroupItem
          value="charts"
          aria-label="Toggle charts view"
          className={`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`}
        >
          <LineChart className="h-4 w-4 mr-2" />
          Charts
        </ToggleGroupItem>
        <ToggleGroupItem
          value="both"
          aria-label="Toggle both views"
          className={`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`}
        >
          <LayoutPanelLeft className="h-4 w-4 mr-2" />
          Both
        </ToggleGroupItem>
      </ToggleGroup>
      <br />
      {viewMode === "both" ? (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={30}>
            <div className="p-4">
              {renderEventsSection()}
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={70}>
            <div className="p-4">
              {renderChartsSection()}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {viewMode === "events" && renderEventsSection()}
          {viewMode === "charts" && renderChartsSection()}
        </div>
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