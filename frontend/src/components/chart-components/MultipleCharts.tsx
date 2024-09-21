import React from 'react';
import { MetricChart } from './MetricChart';
import { CountryMetrics } from '@/services/api';

interface MultipleChartsProps {
    selectedMetrics: string[];
    metrics: CountryMetrics;
    years: number[];
    months: string[];
}

export const MultipleCharts: React.FC<MultipleChartsProps> = ({
    selectedMetrics,
    metrics,
    years,
    months,
}) => {
    return (
        <>
            {selectedMetrics.map(metricKey => (
                <MetricChart
                    key={metricKey}
                    metricKey={metricKey}
                    metricInfo={metrics[metricKey]}
                    years={years}
                    months={months}
                />
            ))}
        </>
    );
};