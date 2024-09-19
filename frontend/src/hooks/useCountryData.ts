import { useState, useEffect } from 'react';
import { api, CountryData, UserProfile } from '@/services/api';

export const useCountryData = (country: string | undefined) => {
  const [countryData, setCountryData] = useState<CountryData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return { countryData, userProfile, error };
};