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

    if (displayMode === 'single') {
      const dataMap: { [date: string]: any } = {};
      selectedMetrics.forEach((metricKey) => {
        const metricInfo = metrics[metricKey];
        if (!metricInfo?.data) return;
        const transformedData = transformData(metricInfo.data);
        transformedData.forEach((dataPoint) => {
          if (!dataMap[dataPoint.date]) {
            dataMap[dataPoint.date] = { date: new Date(dataPoint.date) };
          }
          dataMap[dataPoint.date][metricKey] = dataPoint.value;
        });
      });
      return Object.values(dataMap).sort((a, b) => a.date - b.date);
    } else {
      const dataPerMetric: { [metricKey: string]: any[] } = {};
      selectedMetrics.forEach((metricKey) => {
        const metricInfo = metrics[metricKey];
        if (!metricInfo?.data) return;
        dataPerMetric[metricKey] = transformData(metricInfo.data.map((dataPoint) => ({
          date: new Date(dataPoint.date),
          value: dataPoint.value,
        })));
      });
      return Object.entries(dataPerMetric).map(([key, value]) => ({ metricKey: key, data: value }));
    }
  }, [metrics, selectedMetrics, displayMode, dataTransformation]);

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
      } else {
        const entry = payload[0];
        const metricInfo = metrics?.[metricKey];
        return (
          <div className="bg-background p-4 border border-border rounded-md shadow-md">
            <p className="font-bold">{format(new Date(label), 'MMM d, yyyy')}</p>
            <p style={{ color: entry.color }}>
              {metricInfo?.label}: {formatValue(entry.value, metricKey, true)} {metricInfo?.unit}
            </p>
            <p className="text-xs text-muted-foreground">Source: {metricInfo?.source}</p>
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

        <div className="mt-4">
          <label htmlFor="display-mode" className="block mb-2">Display Mode:</label>
          <select
            id="display-mode"
            value={displayMode}
            onChange={(e) => setDisplayMode(e.target.value as 'single' | 'multiple')}
            className="border p-2 rounded mb-4"
          >
            <option value="single">Single Chart</option>
            <option value="multiple">Multiple Charts</option>
          </select>
          <label htmlFor="chart-type" className="block mb-2">Chart Type:</label>
          <select
            id="chart-type"
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'Line' | 'Area' | 'Bar')}
            className="border p-2 rounded mb-4"
          >
            <option value="Line">Line</option>
            <option value="Area">Area</option>
            <option value="Bar">Bar</option>
          </select>
          <label htmlFor="data-transformation" className="block mb-2">Data Transformation:</label>
          <select
            id="data-transformation"
            value={dataTransformation}
            onChange={(e) => setDataTransformation(e.target.value as 'none' | 'normalize' | 'percentChange')}
            className="border p-2 rounded mb-4"
          >
            <option value="none">None</option>
            <option value="normalize">Normalize (Index to 100)</option>
            <option value="percentChange">Percentage Change</option>
          </select>
        </div>

        {displayMode === 'single' ? (
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
        ) : (
          chartData.map(({ metricKey, data }) => (
            <div key={metricKey} className="mb-6">
              <h3 className="text-lg font-semibold mb-2">{metrics?.[metricKey]?.label || metricKey}</h3>
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
                    tickFormatter={(value) => formatYAxisTick(value, metricKey)}
                    domain={['auto', 'auto']}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip metricKey={metricKey} />} />
                  {chartType === 'Line' && <Line type="monotone" dataKey="value" stroke={COLORS[0]} dot={false} />}
                  {chartType === 'Area' && <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} />}
                  {chartType === 'Bar' && <Bar dataKey="value" fill={COLORS[0]} />}
                </ChartComponent>
              </ResponsiveContainer>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
