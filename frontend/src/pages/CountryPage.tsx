import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { api, CountryData, Report, UserProfile } from '@/services/api';
import { ReportDialog } from '@/components/ReportDialog';
import { ArticleDialog } from '@/components/ArticleDialog';
import { MarkdownContent } from '@/components/MarkdownContent';
import { CountryPageHeader } from '@/components/CountryPageHeader';

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
    <div className="p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
        <CountryPageHeader countryData={countryData} userProfile={userProfile} />
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <ReportDialog 
            report={countryReport} 
            isLoading={isGeneratingCountryReport} 
            onGenerate={handleGenerateCountryReport}
            error={countryReportError}
            title="Generate Country Report"
          />
          <Button onClick={handleBackToDashboard} variant="outline" className="w-full sm:w-auto">Back to Dashboard</Button>
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