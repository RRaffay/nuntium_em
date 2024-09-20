import React, { useState, useEffect, useMemo } from 'react';
import { CountryMetrics, api } from '@/services/api';
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Expand } from 'lucide-react';
import { DialogTitle, DialogHeader } from "@/components/ui/dialog";

interface EconomicIndicatorsChartProps {
  country: string;
}

const metricOptions = [
  { value: 'gdp_per_capita', label: 'GDP per Capita', unit: 'USD' },
  { value: 'gdp_growth', label: 'GDP Growth', unit: '%' },
  { value: 'inflation', label: 'Inflation Rate', unit: '%' },
  { value: 'unemployment', label: 'Unemployment Rate', unit: '%' },
  { value: 'current_account_balance', label: 'Current Account Balance', unit: 'USD' },
  { value: 'foreign_exchange_reserves', label: 'Foreign Exchange Reserves', unit: 'USD' },
  { value: 'debt_to_gdp', label: 'Debt to GDP', unit: '%' },
  { value: 'population', label: 'Population', unit: 'people' },
  { value: 'exports_of_goods_and_services', label: 'Exports of Goods and Services', unit: '% of GDP' },
  { value: 'imports_of_goods_and_services', label: 'Imports of Goods and Services', unit: '% of GDP' },
  { value: 'manufacturing_value_added', label: 'Manufacturing Value Added', unit: '% of GDP' },
  { value: 'exchange_rate', label: 'Exchange Rate', unit: 'Local Currency/USD' },
  { value: 'stock_index', label: 'Stock Index', unit: 'points' },
  { value: 'commodity_price', label: 'Commodity Price', unit: 'USD' },
  { value: 'trade_balance', label: 'Trade Balance', unit: '% of GDP' },
  { value: 'stock_market_volatility', label: 'Stock Market Volatility', unit: '%' },
  { value: 'exchange_rate_volatility', label: 'Exchange Rate Volatility', unit: '%' },
  { value: 'real_effective_exchange_rate', label: 'Real Effective Exchange Rate', unit: 'index' },
];

const colors = [
  '#4C9AFF', '#F78C6C', '#82AAFF', '#C792EA', '#7FD1FF',
  '#F78C6C', '#C3E88D', '#FF5370', '#89DDFF', '#F07178'
];

export const EconomicIndicatorsChart: React.FC<EconomicIndicatorsChartProps> = ({ country }) => {
  const [metrics, setMetrics] = useState<CountryMetrics | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['gdp_per_capita', 'inflation', 'unemployment']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (country) {
        try {
          setLoading(true);
          const metricsData = await api.getCountryMetrics(country);
          setMetrics(metricsData);
          // Set available metrics based on data
          const availableMetrics = Object.keys(metricsData).filter(key => metricsData[key].length > 0);
          setAvailableMetrics(availableMetrics);
          // Set initial selected metrics based on available data
          setSelectedMetrics(prevSelected =>
            prevSelected.filter(metric => availableMetrics.includes(metric))
          );
          setError(null);
        } catch (error) {
          console.error('Error fetching country metrics:', error);
          setError('Failed to load economic indicators');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchMetrics();
  }, [country]);

  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [dialogSelectedMetrics, setDialogSelectedMetrics] = useState(selectedMetrics);

  const chartData = useMemo(() => {
    const dataMap: { [date: string]: any } = {};
    selectedMetrics.forEach((metricKey) => {
      const metricData = metrics?.[metricKey];
      if (!metricData) return;
      metricData.forEach((dataPoint) => {
        if (!dataMap[dataPoint.date]) {
          dataMap[dataPoint.date] = { date: new Date(dataPoint.date) };
        }
        dataMap[dataPoint.date][metricKey] = dataPoint.value;
      });
    });
    return Object.values(dataMap).sort((a, b) => a.date - b.date);
  }, [metrics, selectedMetrics]);

  const formatValue = (value: number, metric: string, forTooltip: boolean = false): string => {
    const option = metricOptions.find(o => o.value === metric);
    if (!option) return value.toString();
    const unit = option.unit;

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
  };

  const formatYAxisTick = (value: number, metric: string): string => {
    const option = metricOptions.find(o => o.value === metric);
    if (!option) return value.toString();
    const unit = option.unit;
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
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-4 border border-border rounded-md shadow-md">
          <p className="font-bold">{format(new Date(label), 'MMM d, yyyy')}</p>
          {payload.map((entry: any, index: number) => {
            const option = metricOptions.find(o => o.value === entry.dataKey);
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {formatValue(entry.value, entry.dataKey, true)} {option?.unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };


  const handleDialogApply = (newSelected: string[]) => {
    setSelectedMetrics(newSelected);
  };

  if (loading) {
    return <div>Loading economic indicators...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!metrics) {
    return <div>No economic data available</div>;
  }

  return (
    <Card className="mt-4">
      <CardContent>
        <div className="mb-6">
          <label htmlFor="metrics-select" className="block mb-2 mt-2">Select Metrics to Display (max 4):</label>
          <div className="flex items-start space-x-2">
            <div className="flex-grow">
              <MultiSelect
                options={metricOptions.filter(option => availableMetrics.includes(option.value))}
                selected={selectedMetrics}
                onChange={setSelectedMetrics}
                className="w-full"
                maxSelections={4}
                expanded={false}
              />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0">
                  <Expand className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Select Metrics</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <MultiSelect
                    options={metricOptions}
                    selected={dialogSelectedMetrics}
                    onChange={handleDialogApply}
                    className="w-full"
                    maxSelections={4}
                    expanded={true}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </div>
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
                stroke={colors[index % colors.length]}
                name={metricOptions.find(option => option.value === metricKey)?.label}
                dot={false}
                strokeWidth={hoveredMetric === null || hoveredMetric === metricKey ? 2 : 1}
                opacity={hoveredMetric === null || hoveredMetric === metricKey ? 1 : 0.3}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};