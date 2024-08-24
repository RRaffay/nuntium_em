
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api, CountryData, Event, ArticleInfo, Report } from '../services/api';

const MarkdownContent: React.FC<{ content: string }> = ({ content }) => (
  <ReactMarkdown 
    remarkPlugins={[remarkGfm]}
    components={{
      p: ({ children }) => <p className="mb-4">{children}</p>,
      h1: ({ children }) => <h1 className="text-2xl font-bold mb-2">{children}</h1>,
      h2: ({ children }) => <h2 className="text-xl font-bold mb-2">{children}</h2>,
      ul: ({ children }) => <ul className="list-disc pl-5 mb-4">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 mb-4">{children}</ol>,
      li: ({ children }) => <li className="mb-1">{children}</li>,
      a: ({ href, children }) => <a href={href} className="text-blue-500 hover:underline">{children}</a>,
    }}
  >
    {content}
  </ReactMarkdown>
);

const ArticleDialog: React.FC<{ event: Event }> = ({ event }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">View Articles</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Articles for Event</DialogTitle>
      </DialogHeader>
      <div className="mt-4 max-h-[60vh] overflow-y-auto">
        {event.articles.map((article, index) => (
          <div key={index} className="mb-4 p-4 border rounded">
            <p className="font-semibold mb-2">Summary:</p>
            <MarkdownContent content={article.summary} />
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Read full article
            </a>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

const ReportDialog: React.FC<{ 
  report: Report | null, 
  isLoading: boolean, 
  onGenerate: () => Promise<void>,
  error: string | null,
  title: string
}> = ({ report, isLoading, onGenerate, error, title }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleGenerate = async () => {
    await onGenerate();
    setIsOpen(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleGenerate}>{title}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <p>Generating report...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : report ? (
            <>
              <MarkdownContent content={report.content} />
              <p className="text-sm text-gray-500 mt-4">Generated at: {new Date(report.generated_at).toLocaleString()}</p>
            </>
          ) : (
            <p>No report generated. Please try again.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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
        <h2 className="text-2xl font-bold">Events in {countryData.country}</h2>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {countryData.events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>Event {event.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <MarkdownContent content={event.cluster_summary} />
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CountryPage;