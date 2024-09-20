import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CountryMetrics, MetricInfo, api } from '@/services/api';
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Expand } from 'lucide-react';
import { DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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

    const dataMap: { [date: string]: any } = {};
    selectedMetrics.forEach((metricKey) => {
      const metricInfo = metrics[metricKey];
      if (!metricInfo?.data) return;
      metricInfo.data.forEach((dataPoint) => {
        if (!dataMap[dataPoint.date]) {
          dataMap[dataPoint.date] = { date: new Date(dataPoint.date) };
        }
        dataMap[dataPoint.date][metricKey] = dataPoint.value;
      });
    });
    return Object.values(dataMap).sort((a, b) => a.date - b.date);
  }, [metrics, selectedMetrics]);

  const formatValue = useCallback((value: number, metricKey: string, forTooltip: boolean = false): string => {
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
  }, [metrics]);

  const formatYAxisTick = useCallback((value: number, metricKey: string): string => {
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
  }, [metrics]);

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-4 border border-border rounded-md shadow-md">
          <p className="font-bold">{format(new Date(label), 'MMM d, yyyy')}</p>
          {payload.map((entry: any, index: number) => {
            const metricInfo = metrics?.[entry.dataKey];
            return (
              <p key={index} style={{ color: entry.color }}>
                {metricInfo?.label}: {formatValue(entry.value, entry.dataKey, true)} {metricInfo?.unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  }, [metrics, formatValue]);

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
                  label: metrics?.[metricKey]?.label || metricKey
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
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Select Metrics</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <MultiSelect
                    options={Object.keys(metrics).map(metricKey => ({
                      value: metricKey,
                      label: metrics[metricKey].label
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
        <ResponsiveContainer width="100%" height={500}>
          <LineChart data={chartData} margin={{ top: 5, right: 40, left: 40, bottom: 20 }}>
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
                width={100}
              />
            ))}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMetrics.map((metricKey, index) => (
              <Line
                key={metricKey}
                type="monotone"
                dataKey={metricKey}
                yAxisId={metricKey}
                stroke={COLORS[index % COLORS.length]}
                name={metrics?.[metricKey]?.label || metricKey}
                dot={false}
                strokeWidth={hoveredMetric === null || hoveredMetric === metricKey ? 2 : 1}
                opacity={hoveredMetric === null || hoveredMetric === metricKey ? 1 : 0.3}
                onMouseEnter={() => setHoveredMetric(metricKey)}
                onMouseLeave={() => setHoveredMetric(null)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};