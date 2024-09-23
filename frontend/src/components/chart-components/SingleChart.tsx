import React from 'react';
import {
    LineChart, AreaChart, BarChart, Line, Area, Bar,
    XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import { CountryMetrics } from '@/services/api';

interface SingleChartProps {
    chartData: any[];
    chartType: 'Line' | 'Area' | 'Bar';
    selectedMetrics: string[];
    metrics: CountryMetrics;
    formatYAxisTick: (value: number, metricKey: string) => string;
    CustomTooltip: React.FC<any>;
    hoveredMetric: string | null;
    setHoveredMetric: (metric: string | null) => void;
}

const COLORS = [
    '#4C9AFF', '#F78C6C', '#82AAFF', '#C792EA', '#7FD1FF',
    '#F78C6C', '#C3E88D', '#FF5370', '#89DDFF', '#F07178'
];

export const SingleChart: React.FC<SingleChartProps> = ({
    chartData,
    chartType,
    selectedMetrics,
    metrics,
    formatYAxisTick,
    CustomTooltip,
    hoveredMetric,
    setHoveredMetric,
}) => {
    const ChartComponent = chartType === 'Line' ? LineChart : chartType === 'Area' ? AreaChart : BarChart;

    return (
        <ResponsiveContainer width="100%" height={500}>
            <ChartComponent data={chartData} margin={{ top: 5, right: 40, left: 40, bottom: 20 }}>
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
    );
};