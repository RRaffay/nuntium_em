import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CountryMetrics, MetricInfo, api } from '@/services/api';
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MetricSelector } from '@/components/chart-components/MetricSelector';
import { ChartOptions } from '@/components/chart-components/ChartOptions';
import { SingleChart } from '@/components/chart-components/SingleChart';
import { MultipleCharts } from '@/components/chart-components/MultipleCharts';
import { QuestionSection } from '@/components/chart-components/QuestionSection';

interface EconomicIndicatorsChartProps {
  country: string;
}

const MAX_METRICS = 4;
const COLORS = [
  '#4C9AFF', '#F78C6C', '#82AAFF', '#C792EA', '#7FD1FF',
  '#F78C6C', '#C3E88D', '#FF5370', '#89DDFF', '#F07178'
];

export const EconomicIndicatorsChart: React.FC<EconomicIndicatorsChartProps> = ({ country }) => {
  const [metrics, setMetrics] = useState<CountryMetrics | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<'single' | 'multiple'>('single');
  const [chartType, setChartType] = useState<'Line' | 'Area' | 'Bar'>('Line');
  const [dataTransformation, setDataTransformation] = useState<'none' | 'normalize' | 'percentChange'>('none');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMaxAlert, setShowMaxAlert] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [dialogSelectedMetrics, setDialogSelectedMetrics] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [userQuestion, setUserQuestion] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [startYear, setStartYear] = useState<number | undefined>(undefined);
  const [startMonth, setStartMonth] = useState<number | undefined>(undefined);
  const [endYear, setEndYear] = useState<number | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<number | undefined>(undefined);
  const [messages, setMessages] = useState<{ content: string; sender: 'user' | 'model'; isLoading?: boolean }[]>([]);

  const fetchMetrics = useCallback(async () => {
    if (!country) return;

    try {
      setLoading(true);
      const metricsData = await api.getCountryMetrics(country);

      if (metricsData && typeof metricsData === 'object' && Object.keys(metricsData).length > 0) {
        setMetrics(metricsData);
        const availableMetrics = Object.keys(metricsData).filter(key =>
          metricsData[key]?.data?.length > 0
        );
        setAvailableMetrics(availableMetrics);
        setSelectedMetrics(availableMetrics.slice(0, 1));
        setError(null);
      } else {
        throw new Error('No valid metrics data received');
      }
    } catch (error) {
      console.error('Error fetching country metrics:', error);
      setError('Failed to load economic indicators');
      setMetrics(null);
      setAvailableMetrics([]);
      setSelectedMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [country]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const chartData = useMemo(() => {
    if (!metrics || selectedMetrics.length === 0) return [];

    const transformData = (dataPoints: any[]) => {
      if (dataTransformation === 'normalize') {
        const firstValue = dataPoints.find(dp => dp.value != null)?.value || 1;
        return dataPoints.map(dp => ({ ...dp, value: dp.value != null ? (dp.value / firstValue) * 100 : null }));
      } else if (dataTransformation === 'percentChange') {
        return dataPoints.map((dp, index, arr) => {
          if (index === 0 || dp.value == null || arr[index - 1].value == null) return { ...dp, value: null };
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
      return selectedMetrics.map(metricKey => ({
        metricKey,
        data: metrics[metricKey]?.data
          ?.map(dp => ({ ...dp, date: new Date(dp.date) }))
          .filter(dp => isInRange(dp.date)) || [],
      }));
    }
  }, [metrics, selectedMetrics, displayMode, dataTransformation, startDate, endDate]);

  const formatValue = useCallback((value: number, metricKey: string, forTooltip: boolean = false): string => {
    if (value == null) return 'N/A';
    if (dataTransformation === 'normalize') {
      return value.toFixed(2);
    } else if (dataTransformation === 'percentChange') {
      return value.toFixed(2) + '%';
    } else {
      const metricInfo = metrics?.[metricKey];
      if (!metricInfo) return value.toString();
      const { unit } = metricInfo;

      let formattedValue = value;
      let suffix = '';

      if (forTooltip) {
        if (Math.abs(value) >= 1e9) {
          formattedValue = value / 1e9;
          suffix = ' billion';
        } else if (Math.abs(value) >= 1e6) {
          formattedValue = value / 1e6;
          suffix = ' million';
        } else if (Math.abs(value) >= 1e3) {
          formattedValue = value / 1e3;
          suffix = ' thousand';
        }
      }

      if (unit === 'USD' || unit === 'people') {
        return formattedValue.toLocaleString('en-US', { maximumFractionDigits: 2 }) + suffix;
      } else if (unit === '%' || unit.includes('index')) {
        return formattedValue.toFixed(2);
      }
      return formattedValue.toFixed(4);
    }
  }, [metrics, dataTransformation]);

  const formatYAxisTick = useCallback((value: number, metricKey: string): string => {
    if (value == null) return '';
    if (dataTransformation === 'normalize') {
      return value.toFixed(0);
    } else if (dataTransformation === 'percentChange') {
      return value.toFixed(0) + '%';
    } else {
      const metricInfo = metrics?.[metricKey];
      if (!metricInfo) return value.toString();
      const { unit } = metricInfo;
      let formattedValue = value;
      let suffix = '';

      if (Math.abs(value) >= 1e9) {
        formattedValue = value / 1e9;
        suffix = 'B';
      } else if (Math.abs(value) >= 1e6) {
        formattedValue = value / 1e6;
        suffix = 'M';
      } else if (Math.abs(value) >= 1e3) {
        formattedValue = value / 1e3;
        suffix = 'K';
      }

      formattedValue = Number(formattedValue.toFixed(2));

      if (unit === 'USD') {
        return `$${formattedValue}${suffix}`;
      } else if (unit === '%') {
        return `${formattedValue}${suffix}%`;
      } else if (unit === 'people') {
        return `${formattedValue}${suffix}`;
      } else {
        return `${formattedValue}${suffix} ${unit}`;
      }
    }
  }, [metrics, dataTransformation]);

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (displayMode === 'single') {
        return (
          <div className="bg-background p-4 border border-border rounded-md shadow-md">
            <p className="font-bold">{format(new Date(label), 'MMM d, yyyy')}</p>
            {payload.map((entry: any, index: number) => {
              const metricInfo = metrics?.[entry.dataKey];
              return (
                <div key={index}>
                  <p style={{ color: entry.color }}>
                    {metricInfo?.label}: {formatValue(entry.value, entry.dataKey, true)} {metricInfo?.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">Source: {metricInfo?.source}</p>
                </div>
              );
            })}
          </div>
        );
      }
    }
    return null;
  }, [metrics, formatValue, displayMode]);

  const handleDialogApply = useCallback((newSelected: string[]) => {
    setSelectedMetrics(newSelected);
    setDialogSelectedMetrics(newSelected);
    setShowMaxAlert(newSelected.length === MAX_METRICS);
  }, []);

  const handleMetricsChange = useCallback((newSelectedMetrics: string[]) => {
    if (newSelectedMetrics.length > 0) {
      setSelectedMetrics(newSelectedMetrics);
      setDialogSelectedMetrics(newSelectedMetrics);
      setShowMaxAlert(newSelectedMetrics.length === MAX_METRICS);
    }
  }, []);

  const handleSubmitQuestion = async () => {
    if (!userQuestion.trim()) return;
    setLoadingAnswer(true);
    const userMessage: { content: string; sender: 'user' } = { content: userQuestion, sender: 'user' };
    const loadingMessage: { content: string; sender: 'model'; isLoading: boolean } = { content: '', sender: 'model', isLoading: true };
    setMessages(prevMessages => [...prevMessages, userMessage, loadingMessage]);
    setUserQuestion('');

    try {
      const selectedData = selectedMetrics.reduce((acc, metricKey) => {
        const metricData = metrics?.[metricKey]?.data || [];
        const filteredData = metricData.filter((dp) => {
          const dpDate = new Date(dp.date);
          const startTime = startDate ? startDate.getTime() : -Infinity;
          const endTime = endDate ? endDate.getTime() : Infinity;
          return dpDate.getTime() >= startTime && dpDate.getTime() <= endTime;
        });
        acc[metricKey] = {
          ...metrics?.[metricKey],
          data: filteredData,
          label: metrics?.[metricKey]?.label || '',
          unit: metrics?.[metricKey]?.unit || '',
          source: metrics?.[metricKey]?.source || '',
          description: metrics?.[metricKey]?.description || '',
        };
        return acc;
      }, {} as CountryMetrics);

      const response = await api.submitDataQuestion(country, selectedData, userQuestion, messages);
      setMessages(prevMessages => [
        ...prevMessages.slice(0, -1),
        { content: response.answer, sender: 'model' }
      ]);
    } catch (error) {
      console.error('Error submitting question:', error);
      setMessages(prevMessages => [
        ...prevMessages.slice(0, -1),
        { content: 'An error occurred while processing your question.', sender: 'model' }
      ]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const years = useMemo(() => {
    if (!metrics) return [];
    const allDates = Object.values(metrics).flatMap(metric => metric.data.map(d => new Date(d.date)));
    const minYear = Math.min(...allDates.map(d => d.getFullYear()));
    const maxYear = new Date().getFullYear();
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  }, [metrics]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (startYear && startMonth) {
      setStartDate(new Date(startYear, startMonth - 1, 1));
    }
    if (endYear && endMonth) {
      setEndDate(new Date(endYear, endMonth, 0)); // Last day of the month
    }
  }, [startYear, startMonth, endYear, endMonth]);

  if (loading) {
    return <div>Loading economic indicators...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!metrics || Object.keys(metrics).length === 0 || selectedMetrics.length === 0) {
    return <div>No economic data available</div>;
  }

  return (
    <Card className="mt-4">
      <CardContent>
        <div className="mb-4">
          <label className="block mb-2">Display Mode:</label>
          <Select onValueChange={(value) => setDisplayMode(value as 'single' | 'multiple')}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select display mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single Chart</SelectItem>
              <SelectItem value="multiple">Multiple Charts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MetricSelector
          availableMetrics={availableMetrics}
          selectedMetrics={selectedMetrics}
          metrics={metrics}
          handleMetricsChange={handleMetricsChange}
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          dialogSelectedMetrics={dialogSelectedMetrics}
          setDialogSelectedMetrics={setDialogSelectedMetrics}
          handleDialogApply={handleDialogApply}
          showMaxAlert={showMaxAlert}
        />

        {displayMode === 'single' && (
          <>
            <ChartOptions
              chartType={chartType}
              setChartType={setChartType}
              dataTransformation={dataTransformation}
              setDataTransformation={setDataTransformation}
              years={years}
              months={months}
              setStartYear={setStartYear}
              setStartMonth={setStartMonth}
              setEndYear={setEndYear}
              setEndMonth={setEndMonth}
            />

            <SingleChart
              chartData={chartData}
              chartType={chartType}
              selectedMetrics={selectedMetrics}
              metrics={metrics}
              formatYAxisTick={formatYAxisTick}
              CustomTooltip={CustomTooltip}
              hoveredMetric={hoveredMetric}
              setHoveredMetric={setHoveredMetric}
            />
          </>
        )}

        {displayMode === 'multiple' && (
          <MultipleCharts
            selectedMetrics={selectedMetrics}
            metrics={metrics}
            years={years}
            months={months}
          />
        )}

        <QuestionSection
          messages={messages}
          userQuestion={userQuestion}
          setUserQuestion={setUserQuestion}
          handleSubmitQuestion={handleSubmitQuestion}
          loadingAnswer={loadingAnswer}
        />
      </CardContent>
    </Card>
  );
};