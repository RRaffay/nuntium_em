import React, { useEffect, useState, useCallback } from 'react';
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
import { FileText, Clock, AlertTriangle } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const Dashboard: React.FC = React.memo(() => {
  const [countries, setCountries] = useState<CountryInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [headerMessage, setHeaderMessage] = useState<string>('');
  const { getDashboardHeader, isVerified, checkVerificationStatus } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [timePeriod, setTimePeriod] = useState<number>(3);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [addableCountries, setAddableCountries] = useState<string[]>([]);
  const [isAddingCountry, setIsAddingCountry] = useState(false);
  const [addProgress, setAddProgress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<string>("grid");

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

        // Filter out countries that are already added and sort alphabetically
        const filteredAddableCountries = allAddableCountries
          .filter(country => !countriesData.map(c => c.name).includes(country))
          .sort((a, b) => a.localeCompare(b));
        setAddableCountries(filteredAddableCountries);

        // Check verification status
        await checkVerificationStatus();
      } catch (err) {
        setError('Failed to fetch data. Please try again later.');
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [getDashboardHeader, checkVerificationStatus]);

  const easeOutQuad = (t: number) => t * (2 - t);

  const handleAddCountry = useCallback(async () => {
    setIsAddingCountry(true);
    setAddProgress(0);
    setSuccessMessage(null);
    setRateLimitError(null);
    const startTime = Date.now();
    const duration = 160000; // 160 seconds

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
      const filteredAddableCountries = allAddableCountries
        .filter(country => !updatedCountries.map(c => c.name).includes(country))
        .sort((a, b) => a.localeCompare(b));
      setAddableCountries(filteredAddableCountries);
    } catch (err) {
      clearInterval(interval);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setError('Failed to add country. Please try again.');
      }
      console.error('Error adding country:', err);
    } finally {
      setIsAddingCountry(false);
    }
  }, [selectedCountry, timePeriod]);

  const handleDeleteCountry = useCallback(async (country: string, event: React.MouseEvent) => {
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
  }, [countries, addableCountries]);

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">{headerMessage}</h1>

      <div className="flex justify-between items-center mb-6">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isVerified}>
              {isVerified ? 'Add Country' : 'Verify Email to Add Country'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            {isVerified ? (
              <>
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
                      <Button onClick={handleAddCountry} disabled={!selectedCountry}>
                        Add Country
                      </Button>
                    </>
                  )}
                </div>
                {rateLimitError && (
                  <p className="text-red-600">{rateLimitError}</p>
                )}
              </>
            ) : (
              <DialogHeader>
                <DialogTitle>Email Verification Required</DialogTitle>
                <p>Please verify your email address to add a new country.</p>
              </DialogHeader>
            )}
          </DialogContent>
        </Dialog>

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value)}>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grid-2x2"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 12h18" /><path d="M12 3v18" /></svg>
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
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
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {new Date(country.timestamp).toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                  <FileText className="h-4 w-4" />
                  <span>Hours of data: {country.hours}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Events Found: {country.no_relevant_events}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
});

export default Dashboard;