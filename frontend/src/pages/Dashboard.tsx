import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const Dashboard: React.FC = () => {
  const [countries, setCountries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [headerMessage, setHeaderMessage] = useState<string>('');
  const { getDashboardHeader } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesData, headerData] = await Promise.all([
          api.getCountries(),
          getDashboardHeader(),
        ]);
        setCountries(countriesData);
        setHeaderMessage(headerData);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [getDashboardHeader]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">{headerMessage}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {countries.map((country) => (
          <Link key={country} to={`/country/${country}`}>
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>{country}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Click to view key events and generate reports</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;