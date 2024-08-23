import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '../services/api';

const Dashboard: React.FC = () => {
  const [countries, setCountries] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await api.getCountries();
        setCountries(data);
      } catch (err) {
        setError('Failed to fetch countries. Please try again later.');
        console.error('Error fetching countries:', err);
      }
    };

    fetchCountries();
  }, []);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
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
  );
};

export default Dashboard;