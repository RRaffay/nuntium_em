// EconomicIndicatorsChart.tsx

import React from 'react';
import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from '@/components/ui/checkbox';
import { CountryMetrics } from '@/services/api';
import { getColor } from '@/utils/colorUtils';
import { Switch } from '@/components/ui/switch'; // Add this import

interface EconomicIndicatorsChartProps {
  metrics: CountryMetrics;
  selectedMetrics: string[];
  setSelectedMetrics: React.Dispatch<React.SetStateAction<string[]>>;
}

const metricOptions = [
  { value: 'exchange_rate', label: 'Exchange Rate (USD)' },
  { value: 'stock_index', label: 'Stock Index' },
  { value: 'gdp_per_capita', label: 'GDP per Capita' },
  { value: 'inflation', label: 'Inflation Rate' },
  { value: 'unemployment', label: 'Unemployment Rate' },
];

const mergeChartData = (metrics: CountryMetrics, selectedMetrics: string[]) => {
  const dataMap: { [date: string]: any } = {};

  selectedMetrics.forEach((metricKey) => {
    const metricData = metrics[metricKey];
    metricData.forEach((dataPoint) => {
      if (!dataMap[dataPoint.date]) {
        dataMap[dataPoint.date] = { date: dataPoint.date };
      }
      dataMap[dataPoint.date][metricKey] = dataPoint.value;
    });
  });

  return Object.values(dataMap)
    .filter(d => d.date && !isNaN(Date.parse(d.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const EconomicIndicatorsChart: React.FC<EconomicIndicatorsChartProps> = ({
  metrics,
  selectedMetrics,
  setSelectedMetrics,
}) => {
  const [combinedChart, setCombinedChart] = React.useState(true);
  const chartData = mergeChartData(metrics, selectedMetrics);

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle>Economic Indicators</CardTitle>
        <CardDescription>Historical data for selected indicators</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col mb-4">
          <label className="mb-2">Select Metrics:</label>
          {metricOptions.map((option) => (
            <label key={option.value} className="flex items-center">
              <Checkbox
                checked={selectedMetrics.includes(option.value)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedMetrics([...selectedMetrics, option.value]);
                  } else {
                    setSelectedMetrics(selectedMetrics.filter((m) => m !== option.value));
                  }
                }}
              />
              <span className="ml-2">{option.label}</span>
            </label>
          ))}
          
          <div className="flex items-center mt-4">
            <Switch
              checked={combinedChart}
              onCheckedChange={setCombinedChart}
              id="combined-chart"
            />
            <label htmlFor="combined-chart" className="ml-2">
              Display all indicators in one chart
            </label>
          </div>
        </div>

        {selectedMetrics.length > 0 ? (
          combinedChart ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: string) => {
                    // Format date for display
                    const date = new Date(value);
                    return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;
                  }}
                />
                <YAxis />
                <Tooltip />
                {selectedMetrics.map((metricKey, index) => (
                  <Line
                    key={metricKey}
                    type="monotone"
                    dataKey={metricKey}
                    stroke={getColor(index)}
                    strokeWidth={2}
                    dot={false}
                    name={metricOptions.find(m => m.value === metricKey)?.label}
                  />
                ))}
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="space-y-8">
              {selectedMetrics.map((metricKey, index) => (
                <ResponsiveContainer key={metricKey} width="100%" height={300}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value: string) => {
                        const date = new Date(value);
                        return `${date.getFullYear()}-${('0' + (date.getMonth() + 1)).slice(-2)}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey={metricKey}
                      stroke={getColor(index)}
                      strokeWidth={2}
                      dot={false}
                      name={metricOptions.find(m => m.value === metricKey)?.label}
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              ))}
            </div>
          )
        ) : (
          <p>Please select at least one metric to display the chart.</p>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 font-medium leading-none">
            Showing historical data for the selected economic indicators <TrendingUp className="h-4 w-4" />
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};
