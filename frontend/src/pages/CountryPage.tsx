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
import { api, CountryData, Event, ArticleInfo } from '../services/api';

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
            <p>{article.summary}</p>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Read full article
            </a>
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

const CountryPage: React.FC = () => {
  const { country } = useParams<{ country: string }>();
  const navigate = useNavigate();
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <Button onClick={handleBackToDashboard} variant="outline">Back to Dashboard</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {countryData.events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>Event {event.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{event.cluster_summary}</p>
              <ArticleDialog event={event} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CountryPage;