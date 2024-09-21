// EconomicIndicatorsChart.tsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CountryMetrics, MetricInfo, api } from '@/services/api';
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  LineChart, AreaChart, BarChart, Line, Area, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Expand } from 'lucide-react';
import { DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Tooltip as TooltipUI } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from 'lucide-react';
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EconomicIndicatorsChartProps {
  country: string;
}

const MAX_METRICS = 4;
const COLORS = [
  '#4C9AFF', '#F78C6C', '#82AAFF', '#C792EA', '#7FD1FF',
  '#F78C6C', '#C3E88D', '#FF5370', '#89DDFF', '#F07178'
];

interface ChartOptions {
  chartType: 'Line' | 'Area' | 'Bar';
  dataTransformation: 'none' | 'normalize' | 'percentChange';
  startDate?: Date;
  endDate?: Date;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

const MetricChart: React.FC<{
  metricKey: string;
  metricInfo: MetricInfo;
  years: number[];
  months: string[];
}> = ({ metricKey, metricInfo, years, months }) => {
  const [chartType, setChartType] = useState<'Line' | 'Area' | 'Bar'>('Line');
  const [dataTransformation, setDataTransformation] = useState<'none' | 'normalize' | 'percentChange'>('none');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startYear, setStartYear] = useState<number | undefined>(undefined);
  const [startMonth, setStartMonth] = useState<number | undefined>(undefined);
  const [endYear, setEndYear] = useState<number | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (startYear && startMonth) {
      setStartDate(new Date(startYear, startMonth - 1, 1));
    }
    if (endYear && endMonth) {
      setEndDate(new Date(endYear, endMonth, 0)); // Last day of the month
    }
  }, [startYear, startMonth, endYear, endMonth]);

  const data = useMemo(() => {
    if (!metricInfo?.data) return [];

    const isInRange = (date: Date) => {
      const dateTime = date.getTime();
      const startTime = startDate ? startDate.getTime() : -Infinity;
      const endTime = endDate ? endDate.getTime() : Infinity;
      return dateTime >= startTime && dateTime <= endTime;
    };

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

    const filteredData = metricInfo.data
      .map(dp => ({ ...dp, date: new Date(dp.date) }))
      .filter(dp => isInRange(dp.date));

    return transformData(filteredData);
  }, [metricInfo, dataTransformation, startDate, endDate]);

  const formatValue = (value: number): string => {
    if (value == null) return 'N/A';
    if (dataTransformation === 'normalize' || dataTransformation === 'percentChange') {
      return value.toFixed(2);
    } else {
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
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0];
      return (
        <div className="bg-background p-4 border border-border rounded-md shadow-md">
          <p className="font-bold">{format(new Date(label), 'MMM d, yyyy')}</p>
          <p style={{ color: entry.color }}>
            {metricInfo?.label}: {formatValue(entry.value)} {metricInfo?.unit}
          </p>
          <p className="text-xs text-muted-foreground">Source: {metricInfo?.source}</p>
        </div>
      );
    }
    return null;
  };

  const ChartComponent = chartType === 'Line' ? LineChart : chartType === 'Area' ? AreaChart : BarChart;

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-2">{metricInfo.label || metricKey}</h3>
      {/* Options for this chart */}
      <Menubar className="mb-4">
        {/* Chart Type */}
        <MenubarMenu>
          <MenubarTrigger>Chart Type: {chartType}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setChartType('Line')}>Line</MenubarItem>
            <MenubarItem onClick={() => setChartType('Area')}>Area</MenubarItem>
            <MenubarItem onClick={() => setChartType('Bar')}>Bar</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Data Transformation */}
        <MenubarMenu>
          <MenubarTrigger>Data Transformation: {dataTransformation === 'none' ? 'None' : dataTransformation === 'normalize' ? 'Normalize' : 'Percentage Change'}</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => setDataTransformation('none')}>None</MenubarItem>
            <MenubarItem onClick={() => setDataTransformation('normalize')}>Normalize (Index to 100)</MenubarItem>
            <MenubarItem onClick={() => setDataTransformation('percentChange')}>Percentage Change</MenubarItem>
          </MenubarContent>
        </MenubarMenu>

        {/* Date Range Selection */}
        <MenubarMenu>
          <MenubarTrigger>Date Range</MenubarTrigger>
          <MenubarContent>
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <div className="mt-1 flex">
                <Select onValueChange={(value) => setStartYear(Number(value))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(value) => setStartMonth(Number(value))}>
                  <SelectTrigger className="w-[120px] ml-2">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="block text-sm font-medium text-gray-700 mt-4">End Date</label>
              <div className="mt-1 flex">
                <Select onValueChange={(value) => setEndYear(Number(value))}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select onValueChange={(value) => setEndMonth(Number(value))}>
                  <SelectTrigger className="w-[120px] ml-2">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month, index) => (
                      <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data} margin={{ top: 5, right: 40, left: 40, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => format(new Date(date), 'MMM\nyyyy')}
            height={60}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={(value) => formatValue(value)}
            domain={['auto', 'auto']}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          {chartType === 'Line' && <Line type="monotone" dataKey="value" stroke={COLORS[0]} dot={false} />}
          {chartType === 'Area' && <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} />}
          {chartType === 'Bar' && <Bar dataKey="value" fill={COLORS[0]} />}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

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
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [startYear, setStartYear] = useState<number | undefined>(undefined);
  const [startMonth, setStartMonth] = useState<number | undefined>(undefined);
  const [endYear, setEndYear] = useState<number | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<number | undefined>(undefined);

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

  const CustomTooltip = useCallback(({ active, payload, label, metricKey }: any) => {
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
    setAnswer(null);

    try {
      // Prepare the data to send
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

      // Send to backend
      const response = await api.submitDataQuestion(country, selectedData, userQuestion);
      setAnswer(response.answer);
    } catch (error) {
      console.error('Error submitting question:', error);
      setAnswer('An error occurred while processing your question.');
    } finally {
      setLoadingAnswer(false);
    }
  };

  // Generate array of years from the earliest data point to current year
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

  const ChartComponent = chartType === 'Line' ? LineChart : chartType === 'Area' ? AreaChart : BarChart;

  return (
    <Card className="mt-4">
      <CardContent>
        {/* Display Mode Selection */}
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

        <div className="mb-6">
          <label htmlFor="metrics-select" className="block mb-2 mt-2">Select Metrics to Display (max {MAX_METRICS}):</label>
          <div className="flex items-start space-x-2">
            <div className="flex-grow">
              <MultiSelect
                options={availableMetrics.map(metricKey => ({
                  value: metricKey,
                  label: (
                    <div className="flex items-center">
                      <span>{metrics?.[metricKey]?.label || metricKey}</span>
                      <TooltipProvider>
                        <TooltipUI>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-2 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{metrics?.[metricKey]?.description}</p>
                            <p className="text-xs mt-1">Source: {metrics?.[metricKey]?.source}</p>
                          </TooltipContent>
                        </TooltipUI>
                      </TooltipProvider>
                    </div>
                  )
                }))}
                selected={selectedMetrics}
                onChange={handleMetricsChange}
                className="w-full"
                maxSelections={MAX_METRICS}
                minSelections={1}
                expanded={false}
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="flex-shrink-0"
                  onClick={() => setDialogSelectedMetrics(selectedMetrics)}
                >
                  <Expand className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>Select Metrics</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <MultiSelect
                    options={Object.keys(metrics).map(metricKey => ({
                      value: metricKey,
                      label: (
                        <div>
                          <div>{metrics[metricKey].label}</div>
                          <div className="text-xs text-muted-foreground">Source: {metrics[metricKey].source}</div>
                        </div>
                      )
                    }))}
                    selected={dialogSelectedMetrics}
                    onChange={handleDialogApply}
                    className="w-full"
                    maxSelections={MAX_METRICS}
                    minSelections={1}
                    expanded={true}
                  />
                </div>
                {showMaxAlert && (
                  <Alert variant="default" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Maximum of {MAX_METRICS} metrics selected. Remove a metric to add another.
                    </AlertDescription>
                  </Alert>
                )}
              </DialogContent>
            </Dialog>
          </div>
          {showMaxAlert && (
            <Alert variant="default" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Maximum of {MAX_METRICS} metrics selected. Remove a metric to add another.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {displayMode === 'single' && (
          <>
            <Menubar className="mb-4">
              <MenubarMenu>
                <MenubarTrigger>Chart Type: {chartType}</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setChartType('Line')}>Line</MenubarItem>
                  <MenubarItem onClick={() => setChartType('Area')}>Area</MenubarItem>
                  <MenubarItem onClick={() => setChartType('Bar')}>Bar</MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              <MenubarMenu>
                <MenubarTrigger>Data Transformation: {dataTransformation === 'none' ? 'None' : dataTransformation === 'normalize' ? 'Normalize' : 'Percentage Change'}</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={() => setDataTransformation('none')}>None</MenubarItem>
                  <MenubarItem onClick={() => setDataTransformation('normalize')}>Normalize (Index to 100)</MenubarItem>
                  <MenubarItem onClick={() => setDataTransformation('percentChange')}>Percentage Change</MenubarItem>
                </MenubarContent>
              </MenubarMenu>

              {/* Date Range Selection */}
              <MenubarMenu>
                <MenubarTrigger>Date Range</MenubarTrigger>
                <MenubarContent>
                  <div className="p-4">
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <div className="mt-1 flex">
                      <Select onValueChange={(value) => setStartYear(Number(value))}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(value) => setStartMonth(Number(value))}>
                        <SelectTrigger className="w-[120px] ml-2">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, index) => (
                            <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mt-4">End Date</label>
                    <div className="mt-1 flex">
                      <Select onValueChange={(value) => setEndYear(Number(value))}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map(year => (
                            <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select onValueChange={(value) => setEndMonth(Number(value))}>
                        <SelectTrigger className="w-[120px] ml-2">
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {months.map((month, index) => (
                            <SelectItem key={month} value={(index + 1).toString()}>{month}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </MenubarContent>
              </MenubarMenu>
            </Menubar>

            <ResponsiveContainer width="100%" height={500}>
              <ChartComponent data={chartData as any[]} margin={{ top: 5, right: 40, left: 40, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM\nyyyy')}
                  height={60}
                  tickMargin={10}
                />
                {selectedMetrics.map((metricKey, index) => (
                  <YAxis
                    key={`y-axis-${metricKey}`}
                    yAxisId={metricKey}
                    orientation={index % 2 === 0 ? "left" : "right"}
                    tickFormatter={(value) => formatYAxisTick(value, metricKey)}
                    domain={['auto', 'auto']}
                    width={80}
                  />
                ))}
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {selectedMetrics.map((metricKey, index) => {
                  const props = {
                    key: metricKey,
                    type: "monotone" as const,
                    dataKey: metricKey,
                    yAxisId: metricKey,
                    stroke: COLORS[index % COLORS.length],
                    fill: COLORS[index % COLORS.length],
                    name: metrics?.[metricKey]?.label || metricKey,
                    dot: false,
                    strokeWidth: hoveredMetric === null || hoveredMetric === metricKey ? 2 : 1,
                    opacity: hoveredMetric === null || hoveredMetric === metricKey ? 1 : 0.3,
                    onMouseEnter: () => setHoveredMetric(metricKey),
                    onMouseLeave: () => setHoveredMetric(null),
                  };

                  if (chartType === 'Line') return <Line {...props} />;
                  if (chartType === 'Area') return <Area {...props} />;
                  return <Bar {...props} />;
                })}
              </ChartComponent>
            </ResponsiveContainer>
          </>
        )}

        {displayMode === 'multiple' &&
          selectedMetrics.map(metricKey => (
            <MetricChart
              key={metricKey}
              metricKey={metricKey}
              metricInfo={metrics[metricKey]}
              years={years}
              months={months}
            />
          ))
        }

        {/* Question Submission Section */}
        <div className="mt-6">
          <label htmlFor="user-question" className="block mb-2">Ask a question about the selected data:</label>
          <textarea
            id="user-question"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            rows={4}
            className="w-full border p-2 rounded mb-2"
            placeholder="Type your question here..."
          />
          <Button onClick={handleSubmitQuestion} disabled={!userQuestion.trim()}>
            Submit Question
          </Button>
        </div>

        {loadingAnswer && <div className="mt-4">Processing your question...</div>}
        {answer && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Answer:</h4>
            <p>{answer}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
