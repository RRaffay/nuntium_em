// hooks/useChartData.ts
import { useMemo } from 'react';
import { CountryMetrics } from '@/services/api';

interface UseChartDataParams {
  metrics: CountryMetrics | null;
  selectedMetrics: string[];
  displayMode: 'single' | 'multiple';
  dataTransformation: 'none' | 'normalize' | 'percentChange';
  startDate?: Date;
  endDate?: Date;
}

export function useChartData({
  metrics,
  selectedMetrics,
  displayMode,
  dataTransformation,
  startDate,
  endDate,
}: UseChartDataParams) {
  const chartData = useMemo(() => {
    if (!metrics || selectedMetrics.length === 0) return [];

    const transformData = (dataPoints: any[]) => {
      if (dataTransformation === 'normalize') {
        const firstValue = dataPoints.find((dp) => dp.value != null)?.value || 1;
        return dataPoints.map((dp) => ({
          ...dp,
          value: dp.value != null ? (dp.value / firstValue) * 100 : null,
        }));
      } else if (dataTransformation === 'percentChange') {
        return dataPoints.map((dp, index, arr) => {
          if (index === 0 || dp.value == null || arr[index - 1].value == null)
            return { ...dp, value: null };
          const percentChange = ((dp.value - arr[index - 1].value) / arr[index - 1].value) * 100;
          return { ...dp, value: percentChange };
        });
      } else {
        return dataPoints;
      }
    };

    const isInRange = (date: Date) => {
      const dateTime = date.getTime();
      const startTime = startDate ? startDate.getTime() : -Infinity;
      const endTime = endDate ? endDate.getTime() : Infinity;
      return dateTime >= startTime && dateTime <= endTime;
    };

    if (displayMode === 'single') {
      const dataMap: { [date: string]: any } = {};
      selectedMetrics.forEach((metricKey) => {
        const metricInfo = metrics[metricKey];
        if (!metricInfo?.data) return;
        const transformedData = transformData(metricInfo.data);
        transformedData.forEach((dataPoint) => {
          const dataPointDate = new Date(dataPoint.date);
          if (isInRange(dataPointDate)) {
            if (!dataMap[dataPoint.date]) {
              dataMap[dataPoint.date] = { date: dataPointDate };
            }
            dataMap[dataPoint.date][metricKey] = dataPoint.value;
          }
        });
      });
      return Object.values(dataMap).sort((a, b) => a.date - b.date);
    } else {
      return selectedMetrics.map((metricKey) => ({
        metricKey,
        data:
          metrics[metricKey]?.data
            ?.map((dp) => ({ ...dp, date: new Date(dp.date) }))
            .filter((dp) => isInRange(dp.date)) || [],
      }));
    }
  }, [metrics, selectedMetrics, displayMode, dataTransformation, startDate, endDate]);

  return chartData;
}
