import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { api, CountryData, Report } from '@/services/api';
import { ReportDialog } from '@/components/ReportDialog';
import { ArticleDialog } from '@/components/ArticleDialog';
import { MarkdownContent } from '@/components/MarkdownContent';


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

  useEffect(() => {
    const fetchCountryData = async () => {
      if (!country) return;
      try {
        const data = await api.getCountryData(country);
        setCountryData(data);
      } catch (err) {
        setError('Failed to fetch country data. Please try again later.');
        console.error('Error fetching country data:', err);
      }
    };

    fetchCountryData();
  }, [country]);

  const handleGenerateCountryReport = async () => {
    if (!country) return;
    setIsGeneratingCountryReport(true);
    setCountryReportError(null);
    try {
      const generatedReport = await api.generateCountryReport(country);
      setCountryReport(generatedReport);
    } catch (err) {
      console.error('Error generating country report:', err);
      setCountryReportError('Failed to generate country report. Please try again.');
      setCountryReport(null);
    } finally {
      setIsGeneratingCountryReport(false);
    }
  };

  const handleGenerateEventReport = async (eventId: string) => {
    if (!country) return;
    setIsGeneratingEventReport(prev => ({ ...prev, [eventId]: true }));
    setEventReportErrors(prev => ({ ...prev, [eventId]: null }));
    try {
      const generatedReport = await api.generateEventReport(country, eventId);
      setEventReports(prev => ({ ...prev, [eventId]: generatedReport }));
    } catch (err) {
      console.error('Error generating event report:', err);
      setEventReportErrors(prev => ({ ...prev, [eventId]: 'Failed to generate event report. Please try again.' }));
      setEventReports(prev => ({ ...prev, [eventId]: null }));
    } finally {
      setIsGeneratingEventReport(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!countryData) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Events in {countryData.country}</h2>
          <br/>
          <p>Last updated: <strong>{new Date(countryData.timestamp).toLocaleString()}</strong></p>
          <p>Hours of data: <strong>{countryData.hours}</strong></p>
          <p>Events Found: <strong>{countryData.no_relevant_events}</strong></p>
        </div>
        <div>
          <ReportDialog 
            report={countryReport} 
            isLoading={isGeneratingCountryReport} 
            onGenerate={handleGenerateCountryReport}
            error={countryReportError}
            title="Generate Country Report"
          />
          <Button onClick={handleBackToDashboard} variant="outline" className="ml-2">Back to Dashboard</Button>
        </div>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {countryData.events.map((event) => (
          <AccordionItem key={event.id} value={event.id}>
            <AccordionTrigger>{event.title}</AccordionTrigger>
            <AccordionContent>
              <MarkdownContent content={event.event_summary} />
              <div className="flex space-x-2 mt-2">
                <ArticleDialog event={event} />
                <ReportDialog 
                  report={eventReports[event.id]} 
                  isLoading={isGeneratingEventReport[event.id] || false} 
                  onGenerate={() => handleGenerateEventReport(event.id)}
                  error={eventReportErrors[event.id] || null}
                  title="Generate Event Report"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default CountryPage;