import { useState, useEffect, useCallback } from 'react';
import { api, CountryData, UserProfile } from '@/services/api';

export const useCountryData = (country: string | undefined) => {
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<number>(0);

  const easeOutQuad = (t: number) => t * (2 - t);


  const fetchData = useCallback(async () => {
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
  }, [country]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCountryData = async (hours: number) => {
    if (!country) return;
    setIsUpdating(true);
    setError(null);
    setUpdateProgress(0);

    const startTime = Date.now();
    const duration = hours * 60 * 1000; // Convert hours to milliseconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setUpdateProgress(progressValue);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100);

    try {
      await api.updateCountry(country, hours);
      await fetchData(); // Refetch the data after updating
    } catch (err) {
      setError('Failed to update country data. Please try again.');
      console.error('Error updating country data:', err);
    } finally {
      clearInterval(interval);
      setUpdateProgress(100);
      setTimeout(() => {
        setIsUpdating(false);
        setUpdateProgress(0);
      }, 1000);
    }
  };

  return { countryData, userProfile, error, isUpdating, updateCountryData, updateProgress };
};