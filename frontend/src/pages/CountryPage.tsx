import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { api, Event, Report } from '../services/api';

const CountryPage: React.FC = () => {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!country) return;
      try {
        const data = await api.getCountryEvents(country);
        setEvents(data);
      } catch (err) {
        setError('Failed to fetch events. Please try again later.');
        console.error('Error fetching events:', err);
      }
    };

    fetchEvents();
  }, [country]);

  const generateReport = async () => {
    if (!country) return;
    try {
      const data = await api.generateReport(country);
      setReport(data);
    } catch (err) {
      setError('Failed to generate report. Please try again later.');
      console.error('Error generating report:', err);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/');
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Events in {country}</h2>
        <Button onClick={handleBackToDashboard} variant="outline">Back to Dashboard</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{event.description}</p>
              <p className="text-sm text-gray-500 mt-2">{new Date(event.date).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button onClick={generateReport}>Generate Report</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Economic Report for {country}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {report ? (
              <div>
                <p className="whitespace-pre-wrap">{report.content}</p>
                <p className="text-sm text-gray-500 mt-2">Generated at: {new Date(report.generated_at).toLocaleString()}</p>
              </div>
            ) : (
              <p>Loading report...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CountryPage;