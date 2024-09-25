import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useCountryData } from '@/hooks/useCountryData';
import { Button } from '@/components/ui/button';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { EconomicIndicatorsChart } from '@/components/EconomicIndicatorsChart';
import { EventList } from '@/components/EventList';
import { LowRelevanceEvents } from '@/components/LowRelevanceEvents';
import { CountryPageHeader } from '@/components/CountryPageHeader';
import { CountryPageAlertDialog } from '@/components/CountryPageAlertDialog';
import { Event as ApiEvent } from '@/services/api';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FileText, LineChart, LayoutPanelLeft } from 'lucide-react';
import { useMetricsData } from '@/hooks/useMetricsData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const CountryPage: React.FC = () => {
  const { country } = useParams<{ country: string }>();
  const { countryData, userProfile, error, isUpdating, updateCountryData, updateProgress, updateCountryInterest } = useCountryData(country);
  const [updateHours, setUpdateHours] = useState(5);
  const { metricsCount } = useMetricsData(country!);
  const {
    eventReports,
    handleGenerateEventReport,
    isGeneratingEventReport,
    eventReportProgress,
    eventReportErrors,
    rateLimitError,
    isAnyReportGenerating,
    showAlertDialog,
    setShowAlertDialog,
  } = useReportGeneration(country);

  const [showLowRelevanceEvents, setShowLowRelevanceEvents] = useState(false);
  const [viewMode, setViewMode] = useState<string>("events");
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isEditingInterest, setIsEditingInterest] = useState(false);
  const [newInterest, setNewInterest] = useState('');

  const handleUpdateCountry = async () => {
    if (country) {
      setIsUpdateDialogOpen(true);
      await updateCountryData(updateHours);
      setTimeout(() => {
        setIsUpdateDialogOpen(false);
      }, 1000);
    }
  };

  const handleEditInterest = useCallback(() => {
    setIsEditingInterest(true);
    setNewInterest(userProfile?.country_interests[country!] || userProfile?.area_of_interest || '');
  }, [userProfile, country]);

  const handleSaveInterest = useCallback(async () => {
    if (country && newInterest) {
      await updateCountryInterest(country, newInterest);
      setIsEditingInterest(false);
    }
  }, [country, newInterest, updateCountryInterest]);

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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Events</h2>
          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogTrigger asChild>
              <Button>Fetch New Events</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Fetch New Events for {country}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                {!isUpdating ? (
                  <div className="flex items-center space-x-2">
                    <label htmlFor="updateHours">Fetch events from the last </label>
                    <Input
                      id="updateHours"
                      type="number"
                      value={updateHours}
                      onChange={(e) => setUpdateHours(Number(e.target.value))}
                      min={2}
                      max={12}
                      className="w-24"
                    />
                    <span>hours</span>
                  </div>
                ) : (
                  <>
                    <Progress value={updateProgress} className="w-full" />
                    <p className="text-center mt-2">Updating... {updateProgress.toFixed(0)}%</p>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleUpdateCountry} disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Start Update'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        {highRelevanceEvents.length > 0 ? (
          <EventList
            events={highRelevanceEvents}
            eventReports={eventReports}
            isGeneratingEventReport={isGeneratingEventReport}
            eventReportProgress={eventReportProgress}
            eventReportErrors={eventReportErrors}
            onGenerateEventReport={handleGenerateEventReport}
            isAnyReportGenerating={isAnyReportGenerating}
            singleColumn={viewMode === "both"}
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
          enableChat={viewMode === "charts"}
        />
      </div>
    );
  };

  return (
    <div className="p-4 md:p-2 lg:p-4">
      <CountryPageHeader
        countryData={countryData}
        userProfile={userProfile}
        metricsCount={metricsCount}
        isEditingInterest={isEditingInterest}
        newInterest={newInterest}
        onEditInterest={handleEditInterest}
        onSaveInterest={handleSaveInterest}
        onChangeInterest={(e) => setNewInterest(e.target.value)}
      />
      <Separator className="my-4" />
      <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)} className="justify-center">
        <ToggleGroupItem
          value="events"
          aria-label="Toggle events view"
          className={`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`}
        >
          <FileText className="h-4 w-4 mr-2" />
          Events
        </ToggleGroupItem>
        <ToggleGroupItem
          value="charts"
          aria-label="Toggle charts view"
          className={`data-[state=on]:bg-primary data-[state=on]:text-primary-foreground`}
        >
          <LineChart className="h-4 w-4 mr-2" />
          Indicators
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