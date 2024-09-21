import React, { useState, useEffect, useMemo } from 'react';
import { MetricInfo } from '@/services/api';
import {
    LineChart, AreaChart, BarChart, Line, Area, Bar,
    XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { format } from 'date-fns';
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface MetricChartProps {
    metricKey: string;
    metricInfo: MetricInfo;
    years: number[];
    months: string[];
}

const COLORS = ['#4C9AFF', '#F78C6C', '#82AAFF', '#C792EA', '#7FD1FF'];

export const MetricChart: React.FC<MetricChartProps> = ({ metricKey, metricInfo, years, months }) => {
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
                return `${formattedValue}${suffix}`;
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