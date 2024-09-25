// EconomicIndicatorsChart.tsx
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { format, startOfYear, endOfYear, eachMonthOfInterval, getYear } from 'date-fns';
import { MetricSelector } from '@/components/chart-components/MetricSelector';
import { ChartOptions } from '@/components/chart-components/ChartOptions';
import { SingleChart } from '@/components/chart-components/SingleChart';
import { MultipleCharts } from '@/components/chart-components/MultipleCharts';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useMetricsData } from '@/hooks/useMetricsData';
import { useChat } from '@/hooks/useChat';
import { useChartData } from '@/hooks/useChartData';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChatInterface, Message } from '@/components/ChatInterface';

interface EconomicIndicatorsChartProps {
  country: string;
  enableChat: boolean;
}

const MAX_METRICS = 4;

export const EconomicIndicatorsChart: React.FC<EconomicIndicatorsChartProps> = ({ country, enableChat }) => {
  const { metrics, loading, error, availableMetrics, latestDates } = useMetricsData(country);

  const {
    userQuestion,
    setUserQuestion,
    loadingAnswer,
    messages,
    handleSubmitQuestion,
    clearChatHistory,
    isChatOpen,
    setIsChatOpen,
    proMode,
    setProMode,
  } = useChat();

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [dialogSelectedMetrics, setDialogSelectedMetrics] = useState<string[]>([]);

  useEffect(() => {
    if (availableMetrics.length > 0 && selectedMetrics.length === 0) {
      setSelectedMetrics(availableMetrics.slice(0, 1)); // Select the first metric by default
      setDialogSelectedMetrics(availableMetrics.slice(0, 1));
    }
  }, [availableMetrics]);

  const [displayMode, setDisplayMode] = useState<'single' | 'multiple'>('multiple');
  const [chartType, setChartType] = useState<'Line' | 'Area' | 'Bar'>('Line');
  const [dataTransformation, setDataTransformation] = useState<'none' | 'normalize' | 'percentChange'>('none');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMaxAlert, setShowMaxAlert] = useState(false);
  const [hoveredMetric, setHoveredMetric] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [startYear, setStartYear] = useState<number | undefined>(undefined);
  const [startMonth, setStartMonth] = useState<number | undefined>(undefined);
  const [endYear, setEndYear] = useState<number | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<number | undefined>(undefined);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const chartData = useChartData({
    metrics,
    selectedMetrics,
    displayMode,
    dataTransformation,
    startDate,
    endDate,
  });

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

  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
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

  useEffect(() => {
    if (startYear && startMonth) {
      setStartDate(new Date(startYear, startMonth - 1, 1));
    } else {
      setStartDate(undefined);
    }
  }, [startYear, startMonth]);

  useEffect(() => {
    if (endYear && endMonth) {
      setEndDate(new Date(endYear, endMonth, 0)); // Last day of the month
    } else {
      setEndDate(undefined);
    }
  }, [endYear, endMonth]);

  const years = useMemo(() => {
    if (!metrics || Object.keys(metrics).length === 0) return [];
    const allDates = Object.values(metrics).flatMap((metric) => metric.data.map((d) => new Date(d.date)));
    const minYear = Math.min(...allDates.map((d) => getYear(d)));
    const maxYear = Math.max(...allDates.map((d) => getYear(d)));
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  }, [metrics]);

  const months = useMemo(() => {
    const now = new Date();
    const monthsInYear = eachMonthOfInterval({
      start: startOfYear(now),
      end: endOfYear(now),
    });
    return monthsInYear.map((date) => format(date, 'MMMM'));
  }, []);

  const handleSendMessage = useCallback(() => {
    if (loadingAnswer) return;
    handleSubmitQuestion({
      country,
      selectedMetrics,
      metrics,
      startDate,
      endDate,
      proMode,
    });
  }, [handleSubmitQuestion, country, selectedMetrics, metrics, startDate, endDate, proMode, loadingAnswer]);

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
    <Card className="mt-4 relative h-[calc(90vh)]">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Visualization Settings</h2>
          {enableChat && !isSmallScreen && (
            <Button size="sm" onClick={() => setIsChatOpen(!isChatOpen)}>
              <MessageCircle className="mr-2 h-4 w-4" />
              {isChatOpen ? 'Close Chat' : 'Open Chat'}
            </Button>
          )}
        </div>
        <ResizablePanelGroup direction={isSmallScreen ? 'vertical' : 'horizontal'} className="flex-grow overflow-hidden">
          <ResizablePanel defaultSize={isChatOpen && !isSmallScreen ? 70 : 100} minSize={50}>
            <div className="p-4 h-full overflow-y-auto">
              <div className="mb-4">
                <Label className="mb-2 block text-sm font-medium">Display Mode</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="display-mode"
                    checked={displayMode === 'multiple'}
                    onCheckedChange={(checked) => setDisplayMode(checked ? 'multiple' : 'single')}
                  />
                  <Label htmlFor="display-mode">
                    {displayMode === 'single' ? 'Single Chart' : 'Multiple Charts'}
                  </Label>
                </div>
              </div>

              <MetricSelector
                availableMetrics={availableMetrics}
                selectedMetrics={selectedMetrics}
                metrics={metrics}
                handleMetricsChange={handleMetricsChange}
                dialogOpen={dialogOpen}
                setDialogOpen={setDialogOpen}
                dialogSelectedMetrics={dialogSelectedMetrics}
                setDialogSelectedMetrics={setDialogSelectedMetrics}
                handleDialogApply={handleDialogApply}
                showMaxAlert={showMaxAlert}
                latestDates={latestDates}
              />

              {displayMode === 'single' && (
                <>
                  <ChartOptions
                    chartType={chartType}
                    setChartType={setChartType}
                    dataTransformation={dataTransformation}
                    setDataTransformation={setDataTransformation}
                    years={years}
                    months={months}
                    setStartYear={setStartYear}
                    setStartMonth={setStartMonth}
                    setEndYear={setEndYear}
                    setEndMonth={setEndMonth}
                  />

                  <SingleChart
                    chartData={chartData}
                    chartType={chartType}
                    selectedMetrics={selectedMetrics}
                    metrics={metrics}
                    formatYAxisTick={formatYAxisTick}
                    CustomTooltip={CustomTooltip}
                    hoveredMetric={hoveredMetric}
                    setHoveredMetric={setHoveredMetric}
                  />
                </>
              )}

              {displayMode === 'multiple' && (
                <MultipleCharts
                  selectedMetrics={selectedMetrics}
                  metrics={metrics}
                  years={years}
                  months={months}
                />
              )}
            </div>
          </ResizablePanel>

          {isChatOpen && enableChat && !isSmallScreen && (
            <>
              <ResizableHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <ChatInterface
                  messages={messages}
                  inputValue={userQuestion}
                  setInputValue={setUserQuestion}
                  handleSendMessage={handleSendMessage}
                  clearChatHistory={clearChatHistory}
                  proMode={proMode}
                  setProMode={setProMode}
                  isSmallScreen={isSmallScreen}
                  isLoading={loadingAnswer}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
        {isSmallScreen && enableChat && (
          <div className="border-t">
            <Button
              className="w-full"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              {isChatOpen ? 'Close Chat' : 'Open Chat'}
            </Button>
            {isChatOpen && (
              <ChatInterface
                messages={messages}
                inputValue={userQuestion}
                setInputValue={setUserQuestion}
                handleSendMessage={handleSendMessage}
                clearChatHistory={clearChatHistory}
                proMode={proMode}
                setProMode={setProMode}
                isSmallScreen={isSmallScreen}
                isLoading={loadingAnswer}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
