import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";
import { Event as ApiEvent, Report } from '@/services/api';
import { EventList } from './EventList';

interface LowRelevanceEventsProps {
  events: ApiEvent[];
  showLowRelevanceEvents: boolean;
  setShowLowRelevanceEvents: (show: boolean) => void;
  eventReports: { [key: string]: Report | null };
  isGeneratingEventReport: { [key: string]: boolean };
  eventReportProgress: { [key: string]: number };
  eventReportErrors: { [key: string]: string | null };
  onGenerateEventReport: (eventId: string) => Promise<void>;
  isAnyReportGenerating: boolean;
}

export const LowRelevanceEvents: React.FC<LowRelevanceEventsProps> = ({
  events,
  showLowRelevanceEvents,
  setShowLowRelevanceEvents,
  eventReports,
  isGeneratingEventReport,
  eventReportProgress,
  eventReportErrors,
  onGenerateEventReport,
  isAnyReportGenerating,
}) => {
  return (
    <div className="mt-8">
      <div className="border-t pt-4 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowLowRelevanceEvents(!showLowRelevanceEvents)}
                variant="secondary"
                className={cn(
                  "w-full font-semibold",
                  showLowRelevanceEvents
                    ? "bg-blue-100 hover:bg-blue-200 text-blue-700"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                )}
              >
                {showLowRelevanceEvents ? 'Hide' : 'Show'} Low Relevance Events ({events.length})
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Low relevance events have a relevance score below 4. These events may be less significant or less directly related to the country's current situation.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {showLowRelevanceEvents && (
        <EventList
          events={events}
          eventReports={eventReports}
          isGeneratingEventReport={isGeneratingEventReport}
          eventReportProgress={eventReportProgress}
          eventReportErrors={eventReportErrors}
          onGenerateEventReport={onGenerateEventReport}
          isAnyReportGenerating={isAnyReportGenerating}
        />
      )}
    </div>
  );
};