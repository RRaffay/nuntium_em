import React, { useState, useMemo } from 'react';
import { CountryMetrics } from '@/services/api';
import { Card, CardContent } from "@/components/ui/card";
import { MultiSelect } from "@/components/ui/multi-select";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EconomicIndicatorsChartProps {
  metrics: CountryMetrics;
  selectedMetrics: string[];
  setSelectedMetrics: React.Dispatch<React.SetStateAction<string[]>>;
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

export const EconomicIndicatorsChart: React.FC<EconomicIndicatorsChartProps> = ({ metrics, selectedMetrics, setSelectedMetrics }) => {
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);

  const chartData = useMemo(() => {
    const dataMap: { [date: string]: any } = {};
    selectedMetrics.forEach((metricKey) => {
      const metricData = metrics[metricKey];
      if (!metricData) return;
      metricData.forEach((dataPoint) => {
        if (!dataMap[dataPoint.date]) {
          dataMap[dataPoint.date] = { date: new Date(dataPoint.date) };
        }
        const value = Number(dataPoint.value);
        dataMap[dataPoint.date][metricKey] = isNaN(value) ? null : value;
      });
    });
    return Object.values(dataMap).sort((a, b) => a.date - b.date);
  }, [metrics, selectedMetrics]);

  const formatValue = (value: number, metric: string): string => {
    const option = metricOptions.find(o => o.value === metric);
    if (!option) return value.toString();
    const unit = option.unit;
    if (unit === 'USD' || unit === 'people') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } else if (unit === '%' || unit.includes('index')) {
      return value.toFixed(2);
    }
    return value.toFixed(4);
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
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value, entry.dataKey)} {metricOptions.find(o => o.value === entry.dataKey)?.unit}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const removeMetric = (metricToRemove: string) => {
    setSelectedMetrics(selectedMetrics.filter(metric => metric !== metricToRemove));
  };

  return (
    <Card className="mt-4">
      <CardContent>
        <div className="mb-6">
          <label htmlFor="metrics-select" className="block mb-2 mt-2">Select Metrics to Display (max 4):</label>
          <MultiSelect
            options={metricOptions}
            selected={selectedMetrics}
            onChange={setSelectedMetrics}
            className="w-full border rounded-md"
            maxSelections={4}
          />
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