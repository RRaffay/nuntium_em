import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { api, CountryData, Report, UserProfile } from '@/services/api';
import { ReportDialog } from '@/components/ReportDialog';
import { ArticleDialog } from '@/components/ArticleDialog';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CountryPageHeader } from '@/components/CountryPageHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";

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
    if (!country) return;
    setIsGeneratingCountryReport(true);
    setCountryReportError(null);
    setRateLimitError(null);
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
      setIsGeneratingCountryReport(false);
    }
  };

  const handleGenerateEventReport = async (eventId: string) => {
    if (!country) return;
    setIsGeneratingEventReport(prev => ({ ...prev, [eventId]: true }));
    setEventReportErrors(prev => ({ ...prev, [eventId]: null }));
    setRateLimitError(null);
    try {
      const generatedReport = await api.generateEventReport(country, eventId);
      setEventReports(prev => ({ ...prev, [eventId]: generatedReport }));
    } catch (err) {
      console.error('Error generating event report:', err);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setEventReportErrors(prev => ({ ...prev, [eventId]: 'Failed to generate event report. Please try again.' }));
      }
      setEventReports(prev => ({ ...prev, [eventId]: null }));
    } finally {
      setIsGeneratingEventReport(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  const handleReportDialogClose = () => {
    setCountryReport(null);
    setCountryReportError(null);
    setEventReports({});
    setEventReportErrors({});
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!countryData) {
    return <div>Loading...</div>;
  }

  // Add this function to sort and filter events by relevance score
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
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <ReportDialog 
            report={countryReport} 
            isLoading={isGeneratingCountryReport} 
            onGenerate={handleGenerateCountryReport}
            error={countryReportError}
            title="Country Report"
            onClose={handleReportDialogClose}
          />
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
                <div className="flex space-x-2 mt-2">
                  <ArticleDialog event={event} />
                  <ReportDialog 
                    report={eventReports[event.id]} 
                    isLoading={isGeneratingEventReport[event.id] || false} 
                    onGenerate={() => handleGenerateEventReport(event.id)}
                    error={eventReportErrors[event.id] || null}
                    title={`Event Report: ${event.title}`}
                    onClose={handleReportDialogClose}
                  />
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
                    <div className="flex space-x-2 mt-2">
                      <ArticleDialog event={event} />
                      <ReportDialog 
                        report={eventReports[event.id]} 
                        isLoading={isGeneratingEventReport[event.id] || false} 
                        onGenerate={() => handleGenerateEventReport(event.id)}
                        error={eventReportErrors[event.id] || null}
                        title={`Event Report: ${event.title}`}
                        onClose={handleReportDialogClose}
                      />
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
    </div>
  );
};

export default CountryPage;