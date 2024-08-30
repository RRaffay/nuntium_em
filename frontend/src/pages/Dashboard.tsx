import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { api, CountryInfo } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { Progress } from '@/components/ui/progress';

const Dashboard: React.FC = () => {
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [headerMessage, setHeaderMessage] = useState<string>('');
  const { getDashboardHeader } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<number>(3);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addableCountries, setAddableCountries] = useState<string[]>([]);
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [addProgress, setAddProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesData, headerData, allAddableCountries] = await Promise.all([
          api.getCountries(),
          getDashboardHeader(),
          api.getAddableCountries(),
        ]);
        setCountries(countriesData);
        setHeaderMessage(headerData);
        
        // Filter out countries that are already added
        const filteredAddableCountries = allAddableCountries.filter(
          country => !countriesData.map(c => c.name).includes(country)
        );
        setAddableCountries(filteredAddableCountries);
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [getDashboardHeader]);

  const easeOutQuad = (t: number) => t * (2 - t);

  const handleAddCountry = async () => {
    setIsAddingCountry(true);
    setAddProgress(0);
    setSuccessMessage(null);
    const startTime = Date.now();
    const duration = 60000; // 60 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setAddProgress(progressValue);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100);

    try {
      await api.runCountryPipeline(selectedCountry, timePeriod);
      clearInterval(interval);
      setAddProgress(100);
      setSuccessMessage(`${selectedCountry} has been successfully added!`);
      // Refresh the countries list
      const updatedCountries = await api.getCountries();
      setCountries(updatedCountries);
      // Update addable countries list
      const allAddableCountries = await api.getAddableCountries();
      const filteredAddableCountries = allAddableCountries.filter(
        country => !updatedCountries.map(c => c.name).includes(country)
      );
      setAddableCountries(filteredAddableCountries);
    } catch (err) {
      clearInterval(interval);
      setError('Failed to add country. Please try again.');
      console.error('Error adding country:', err);
    } finally {
      setIsAddingCountry(false);
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">{headerMessage}</h1>
      <div className="mb-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Country</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a New Country</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {isAddingCountry ? (
                <>
                  <p>Adding Country</p>
                  <Progress value={addProgress} className="mt-2" />
                </>
              ) : successMessage ? (
                <p className="text-green-600">{successMessage}</p>
              ) : (
                <>
                  <Select onValueChange={(value) => setSelectedCountry(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {addableCountries.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Time period (2-24 hours)"
                    min={2}
                    max={24}
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(Number(e.target.value))}
                  />
                  <Button onClick={handleAddCountry}>Add Country</Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {countries.map((country) => (
          <Link key={country.name} to={`/country/${country.name}`}>
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardHeader>
                <CardTitle>{country.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Last updated: {new Date(country.timestamp).toLocaleString()}</p>
                <p>Hours of data: {country.hours}</p>
                <p>Events Found: {country.no_matched_clusters}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;