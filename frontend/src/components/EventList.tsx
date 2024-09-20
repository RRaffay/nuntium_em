import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ArticleDialog } from '@/components/ArticleDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { Progress } from '@/components/ui/progress';
import { Event as ApiEvent, Report } from '@/services/api';

interface EventListProps {
  events: ApiEvent[];
  eventReports: { [key: string]: Report | null };
  isGeneratingEventReport: { [key: string]: boolean };
  eventReportProgress: { [key: string]: number };
  eventReportErrors: { [key: string]: string | null };
  onGenerateEventReport: (eventId: string) => Promise<void>;
  isAnyReportGenerating: boolean;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  eventReports,
  isGeneratingEventReport,
  eventReportProgress,
  eventReportErrors,
  onGenerateEventReport,
  isAnyReportGenerating,
}) => {
  return (
    <div className="mt-4">
      <Accordion type="single" collapsible className="w-full">
        {events.map((event) => (
          <AccordionItem key={event.id} value={event.id}>
            <AccordionTrigger className="flex justify-between items-center">
              <span>{event.title}</span>
            </AccordionTrigger>
            <AccordionContent>
              <span className="text-sm text-gray-500">Relevance Score: {event.relevance_score}</span>
              <MarkdownContent content={event.event_summary} />
              <div className="flex space-x-2 mt-4 items-center">
                <ArticleDialog event={event} />
                <div className="relative inline-block">
                  <ReportDialog 
                    report={eventReports[event.id]} 
                    isLoading={isGeneratingEventReport[event.id] || false} 
                    onGenerate={() => onGenerateEventReport(event.id)}
                    error={eventReportErrors[event.id] || null}
                    title={`Event Report`}
                    onClose={() => {}}
                    progress={eventReportProgress[event.id] || 0}
                    autoGenerateOnOpen={false}
                    buttonText={eventReports[event.id] ? "View Report" : "Generate Report"}
                    canOpen={!isAnyReportGenerating}
                  />
                  {isGeneratingEventReport[event.id] && (
                    <div className="w-full sm:w-auto mt-2">
                      <Progress className="w-full" value={eventReportProgress[event.id] || 0} />
                    </div>
                  )}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};