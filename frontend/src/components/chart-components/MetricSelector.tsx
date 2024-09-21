import React from 'react';
import { MultiSelect } from "@/components/ui/multi-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Expand, Info } from "lucide-react";
import { Tooltip as TooltipUI } from "@/components/ui/tooltip";
import { TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CountryMetrics } from '@/services/api';

interface MetricSelectorProps {
    availableMetrics: string[];
    selectedMetrics: string[];
    metrics: CountryMetrics;
    handleMetricsChange: (newSelectedMetrics: string[]) => void;
    dialogOpen: boolean;
    setDialogOpen: (open: boolean) => void;
    dialogSelectedMetrics: string[];
    setDialogSelectedMetrics: (metrics: string[]) => void;
    handleDialogApply: (newSelected: string[]) => void;
    showMaxAlert: boolean;
}

const MAX_METRICS = 4;

export const MetricSelector: React.FC<MetricSelectorProps> = ({
    availableMetrics,
    selectedMetrics,
    metrics,
    handleMetricsChange,
    dialogOpen,
    setDialogOpen,
    dialogSelectedMetrics,
    setDialogSelectedMetrics,
    handleDialogApply,
    showMaxAlert,
}) => {
    return (
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
    );
};