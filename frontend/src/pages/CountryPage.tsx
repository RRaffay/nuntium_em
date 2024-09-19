// CountryPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { api, CountryData, Report, UserProfile } from '@/services/api';
import { ReportDialog } from '@/components/ReportDialog';
import { ArticleDialog } from '@/components/ArticleDialog';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CountryPageHeader } from '@/components/CountryPageHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";
import { CountryPageAlertDialog } from '@/components/CountryPageAlertDialog';

const CountryPage: React.FC = () => {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [countryReport, setCountryReport] = useState<Report | null>(null);
  const [eventReports, setEventReports] = useState<{ [key: string]: Report | null }>({});
  const [isGeneratingCountryReport, setIsGeneratingCountryReport] = useState(false);
  const [isGeneratingEventReport, setIsGeneratingEventReport] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [countryReportError, setCountryReportError] = useState<string | null>(null);
  const [eventReportErrors, setEventReportErrors] = useState<{ [key: string]: string | null }>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [showLowRelevanceEvents, setShowLowRelevanceEvents] = useState(false);
  const [countryReportProgress, setCountryReportProgress] = useState<number>(0);
  const [eventReportProgress, setEventReportProgress] = useState<{ [key: string]: number }>({});
  const [isAnyReportGenerating, setIsAnyReportGenerating] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!country) return;
      try {
        const [countryData, profile] = await Promise.all([
          api.getCountryData(country),
          api.getUserProfile()
        ]);
        setCountryData(countryData);
        setUserProfile(profile);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [country]);

  const handleGenerateCountryReport = async () => {
    if (isAnyReportGenerating) {
      setShowAlertDialog(true);
      return;
    }
    if (!country) return;
    if (isGeneratingCountryReport) return; // Prevent re-triggering
    setIsAnyReportGenerating(true);
    setIsGeneratingCountryReport(true);
    setCountryReportError(null);
    setRateLimitError(null);
    setCountryReportProgress(0);

    const startTime = Date.now();
    const duration = 210000; // 210 seconds
    const easeOutQuad = (t: number) => t * (2 - t);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setCountryReportProgress(progressValue);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100); // Update every 100ms

    try {
      const generatedReport = await api.generateCountryReport(country);
      setCountryReport(generatedReport);
    } catch (err) {
      console.error('Error generating country report:', err);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setCountryReportError('Failed to generate country report. Please try again.');
      }
      setCountryReport(null);
    } finally {
      clearInterval(interval);
      setCountryReportProgress(100);
      setIsGeneratingCountryReport(false);
      setIsAnyReportGenerating(false);
    }
  };

  const handleGenerateEventReport = async (eventId: string) => {
    if (isAnyReportGenerating) {
      setShowAlertDialog(true);
      return;
    }
    if (!country) return;
    if (isGeneratingEventReport[eventId]) return; // Prevent re-triggering
    setIsAnyReportGenerating(true);
    setIsGeneratingEventReport((prev) => ({ ...prev, [eventId]: true }));
    setEventReportErrors((prev) => ({ ...prev, [eventId]: null }));
    setRateLimitError(null);
    setEventReportProgress((prev) => ({ ...prev, [eventId]: 0 }));

    const startTime = Date.now();
    const duration = 210000; // 210 seconds
    const easeOutQuad = (t: number) => t * (2 - t);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setEventReportProgress((prev) => ({ ...prev, [eventId]: progressValue }));

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100); // Update every 100ms

    try {
      const generatedReport = await api.generateEventReport(country, eventId);
      setEventReports((prev) => ({ ...prev, [eventId]: generatedReport }));
    } catch (err) {
      console.error('Error generating event report:', err);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setEventReportErrors((prev) => ({
          ...prev,
          [eventId]: 'Failed to generate event report. Please try again.',
        }));
      }
      setEventReports((prev) => ({ ...prev, [eventId]: null }));
    } finally {
      clearInterval(interval);
      setEventReportProgress((prev) => ({ ...prev, [eventId]: 100 }));
      setIsGeneratingEventReport((prev) => ({ ...prev, [eventId]: false }));
      setIsAnyReportGenerating(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleReportDialogClose = () => {
    // Do not reset report data when dialog is closed
    // This allows the user to reopen the dialog and see progress or the completed report
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!countryData) {
    return <div>Loading...</div>;
  }

  // Function to sort and filter events by relevance score
  const getFilteredEvents = () => {
    const highRelevanceEvents = countryData?.events.filter(event => event.relevance_score >= 4) || [];
    const lowRelevanceEvents = countryData?.events.filter(event => event.relevance_score < 4) || [];
    
    return {
      highRelevanceEvents: highRelevanceEvents.sort((a, b) => b.relevance_score - a.relevance_score),
      lowRelevanceEvents: lowRelevanceEvents.sort((a, b) => b.relevance_score - a.relevance_score)
    };
  };

  const { highRelevanceEvents, lowRelevanceEvents } = getFilteredEvents();

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <CountryPageHeader countryData={countryData} userProfile={userProfile} />
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 items-center">
          <div className="relative inline-block">
            <ReportDialog 
              report={countryReport} 
              isLoading={isGeneratingCountryReport} 
              onGenerate={handleGenerateCountryReport}
              error={countryReportError}
              title="Country Report"
              onClose={handleReportDialogClose}
              progress={countryReportProgress}
              buttonText={countryReport ? "View Report" : "Generate Report"}
              canOpen={!isAnyReportGenerating}
            />
            {isGeneratingCountryReport && (
              <div className="w-full sm:w-auto mt-2">
                <Progress className="w-full" value={countryReportProgress} />
                <span>{Math.round(countryReportProgress)}%</span>
              </div>
            )}
          </div>
          <Button onClick={handleBackToDashboard} variant="outline" className="w-full sm:w-auto">Back to Dashboard</Button>
        </div>
      </div>
      {highRelevanceEvents.length > 0 ? (
        <Accordion type="single" collapsible className="w-full">
          {highRelevanceEvents.map((event) => (
            <AccordionItem key={event.id} value={event.id}>
              <AccordionTrigger className="flex justify-between items-center">
                <span>{event.title}</span>
              </AccordionTrigger>
              <AccordionContent>
                <span className="text-sm text-gray-500">Relevance Score: {event.relevance_score}</span>
                <MarkdownContent content={event.event_summary} />
                <div className="flex space-x-2 mt-2 items-center">
                  <ArticleDialog event={event} />
                  <div className="relative inline-block">
                    <ReportDialog 
                      report={eventReports[event.id]} 
                      isLoading={isGeneratingEventReport[event.id] || false} 
                      onGenerate={() => handleGenerateEventReport(event.id)}
                      error={eventReportErrors[event.id] || null}
                      title={`Event Report`}
                      onClose={handleReportDialogClose}
                      progress={eventReportProgress[event.id] || 0}
                      autoGenerateOnOpen={false}
                      buttonText={eventReports[event.id] ? "View Report" : "Generate Report"}
                      canOpen={!isAnyReportGenerating}
                    />
                    {isGeneratingEventReport[event.id] && (
                      <div className="w-full sm:w-auto mt-2">
                        <Progress className="w-full" value={eventReportProgress[event.id] || 0} />
                      </div>
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-4">
          <p>No highly relevant events found for this country.</p>
          {lowRelevanceEvents.length > 0 && (
            <p>You can still view events with lower relevance scores below.</p>
          )}
        </div>
      )}

      {lowRelevanceEvents.length > 0 && (
        <div className="mt-8">
          <div className="border-t pt-4 mb-4">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowLowRelevanceEvents(!showLowRelevanceEvents)}
                    variant="secondary"
                    className={cn(
                      "w-full font-semibold",
                      showLowRelevanceEvents
                        ? "bg-blue-100 hover:bg-blue-200 text-blue-700"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    )}
                  >
                    {showLowRelevanceEvents ? 'Hide' : 'Show'} Low Relevance Events ({lowRelevanceEvents.length})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Low relevance events have a relevance score below 4. These events may be less significant or less directly related to the country's current situation.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {showLowRelevanceEvents && (
            <Accordion type="single" collapsible className="w-full">
              {lowRelevanceEvents.map((event) => (
                <AccordionItem key={event.id} value={event.id}>
                  <AccordionTrigger className="flex justify-between items-center">
                    <span>{event.title}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <span className="text-sm text-gray-500">Relevance Score: {event.relevance_score}</span>
                    <MarkdownContent content={event.event_summary} />
                    <div className="flex space-x-2 mt-2 items-center">
                      <ArticleDialog event={event} />
                      <div className="relative inline-block">
                        <ReportDialog 
                          report={eventReports[event.id]} 
                          isLoading={isGeneratingEventReport[event.id] || false} 
                          onGenerate={() => handleGenerateEventReport(event.id)}
                          error={eventReportErrors[event.id] || null}
                          title={`Event Report`}
                          onClose={handleReportDialogClose}
                          progress={eventReportProgress[event.id] || 0}
                          autoGenerateOnOpen={false}
                          buttonText={eventReports[event.id] ? "View Report" : "Generate Report"}
                          canOpen={!isAnyReportGenerating}
                        />
                        {isGeneratingEventReport[event.id] && (
                          <div className="w-full sm:w-auto mt-2">
                            <Progress className="w-full" value={eventReportProgress[event.id] || 0} />
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
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

export default CountryPage;
