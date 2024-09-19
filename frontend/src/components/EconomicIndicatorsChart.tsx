// EconomicIndicatorsChart.tsx

import React from 'react';
import { CountryMetrics } from '@/services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EconomicIndicatorsChartProps {
  metrics: CountryMetrics;
  selectedMetrics: string[];
  setSelectedMetrics: (metrics: string[]) => void;
}

const metricOptions = [
  { value: 'gdp_per_capita', label: 'GDP per Capita' },
  { value: 'gdp_growth', label: 'GDP Growth' },
  { value: 'inflation', label: 'Inflation Rate' },
  { value: 'unemployment', label: 'Unemployment Rate' },
  { value: 'current_account_balance', label: 'Current Account Balance' },
  { value: 'foreign_exchange_reserves', label: 'Foreign Exchange Reserves' },
  { value: 'debt_to_gdp', label: 'Debt to GDP' },
  { value: 'population', label: 'Population' },
  { value: 'exports_of_goods_and_services', label: 'Exports of Goods and Services' },
  { value: 'imports_of_goods_and_services', label: 'Imports of Goods and Services' },
  { value: 'manufacturing_value_added', label: 'Manufacturing Value Added' },
  { value: 'exchange_rate', label: 'Exchange Rate' },
  { value: 'stock_index', label: 'Stock Index' },
  { value: 'commodity_price', label: 'Commodity Price' },
  { value: 'trade_balance', label: 'Trade Balance' },
  { value: 'stock_market_volatility', label: 'Stock Market Volatility' },
  { value: 'exchange_rate_volatility', label: 'Exchange Rate Volatility' },
  { value: 'real_effective_exchange_rate', label: 'Real Effective Exchange Rate' },
];

export const EconomicIndicatorsChart: React.FC<EconomicIndicatorsChartProps> = ({ metrics, selectedMetrics, setSelectedMetrics }) => {
  React.useEffect(() => {
    console.log('Available metrics:', Object.keys(metrics));
    console.log('Selected metrics:', selectedMetrics);
  }, [metrics, selectedMetrics]);

  const handleMetricChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(event.target.selectedOptions).map(option => option.value);
    setSelectedMetrics(selectedOptions);
  };

  const mergeChartData = () => {
    const dataMap: { [date: string]: any } = {};

    selectedMetrics.forEach((metricKey) => {
      const metricData = metrics[metricKey];
      if (!metricData) return;

      metricData.forEach((dataPoint) => {
        if (!dataMap[dataPoint.date]) {
          dataMap[dataPoint.date] = { date: dataPoint.date };
        }
        // Convert string values to numbers and handle potential NaN
        const value = Number(dataPoint.value);
        dataMap[dataPoint.date][metricKey] = isNaN(value) ? null : value;
      });
    });

    return Object.values(dataMap)
      .filter(d => d.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData = mergeChartData();
  console.log('Chart data:', chartData);

  // Function to determine Y-axis domain
  const getYAxisDomain = (dataKey: string) => {
    const values = chartData.map(item => item[dataKey]).filter(v => v != null);
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return [min - padding, max + padding];
  };

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Economic Indicators</h2>
      <div className="mb-4">
        <label htmlFor="metrics-select" className="block mb-2">Select Metrics to Display:</label>
        <select
          id="metrics-select"
          multiple
          value={selectedMetrics}
          onChange={handleMetricChange}
          className="border p-2 w-full md:w-1/2"
        >
          {metricOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <small className="block mt-2">Hold down the Ctrl (Windows) or Command (Mac) button to select multiple options.</small>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <XAxis dataKey="date" />
          {selectedMetrics.map(metricKey => (
            <YAxis 
              key={`y-axis-${metricKey}`}
              yAxisId={metricKey} 
              orientation={selectedMetrics.indexOf(metricKey) % 2 === 0 ? "left" : "right"}
              domain={getYAxisDomain(metricKey)}
            />
          ))}
          <Tooltip />
          <Legend />
          {selectedMetrics.map(metricKey => (
            <Line
              key={metricKey}
              type="monotone"
              dataKey={metricKey}
              yAxisId={metricKey}
              stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`}
              name={metricOptions.find(option => option.value === metricKey)?.label}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
