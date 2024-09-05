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
import { Trash2 } from 'lucide-react';

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
    const duration = 120000; // 120 seconds

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
      setSuccessMessage(`Events for ${selectedCountry} have been successfully added!`);
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

  const handleDeleteCountry = async (country: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (window.confirm(`Are you sure you want to delete data for ${country}?`)) {
      try {
        await api.deleteCountry(country);
        setCountries(countries.filter(c => c.name !== country));
        setAddableCountries([...addableCountries, country]);
      } catch (err) {
        setError('Failed to delete country. Please try again.');
        console.error('Error deleting country:', err);
      }
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
                  <p>Fetching events for country</p>
                  <Progress value={addProgress} className="mt-2" />
                </>
              ) : successMessage ? (
                <p className="text-green-600">{successMessage}</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label htmlFor="country-select" className="text-sm font-medium">
                      Country Name
                    </label>
                    <Select onValueChange={(value) => setSelectedCountry(value)}>
                      <SelectTrigger id="country-select">
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
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="time-period" className="text-sm font-medium">
                      Hours
                    </label>
                    <Input
                      id="time-period"
                      type="number"
                      placeholder="Time period (2-24 hours)"
                      min={2}
                      max={24}
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(Number(e.target.value))}
                    />
                  </div>
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
          <Card className="hover:shadow-lg transition-shadow duration-300 relative">
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                {country.name}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteCountry(country.name, e)}
                  className="absolute top-2 right-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Last updated: {new Date(country.timestamp).toLocaleString()}</p>
              <p>Hours of data: {country.hours}</p>
              <p>Events Found: {country.no_relevant_events}</p>
            </CardContent>
          </Card>
        </Link>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;