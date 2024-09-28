// hooks/useMetricsData.ts
import { useState, useEffect, useCallback } from 'react';
import { CountryMetrics, api } from '@/services/api';

interface UseMetricsDataResult {
  metrics: CountryMetrics | null;
  loading: boolean;
  error: string | null;
  availableMetrics: string[];
  latestDates: { [key: string]: string };
  metricsCount: number; 
}

export function useMetricsData(country: string): UseMetricsDataResult {
  const [metrics, setMetrics] = useState<CountryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [latestDates, setLatestDates] = useState<{ [key: string]: string }>({});
  const [metricsCount, setMetricsCount] = useState<number>(0); 

  const fetchMetrics = useCallback(async () => {
    if (!country) return;

    try {
      setLoading(true);
      const metricsData = await api.getCountryMetrics(country);

      if (metricsData && typeof metricsData === 'object' && Object.keys(metricsData).length > 0) {
        setMetrics(metricsData);
        const availableMetrics = Object.keys(metricsData).filter(
          (key) => metricsData[key]?.data?.length > 0
        );
        setAvailableMetrics(availableMetrics);

        const latestDatesObj = Object.keys(metricsData).reduce((acc, key) => {
          const data = metricsData[key]?.data;
          if (data && data.length > 0) {
            acc[key] = data[data.length - 1].date;
          }
          return acc;
        }, {} as { [key: string]: string });
        setLatestDates(latestDatesObj);

        setMetricsCount(availableMetrics.length); 
      } else {
        throw new Error('No valid metrics data received');
      }
    } catch (error) {
      console.error('Error fetching country metrics:', error);
      setError('Failed to load economic indicators');
      setMetrics(null);
      setAvailableMetrics([]);
      setMetricsCount(0); 
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, availableMetrics, latestDates, metricsCount };
}
