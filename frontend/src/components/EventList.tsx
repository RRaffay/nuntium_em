import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArticleDialog } from '@/components/ArticleDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { Progress } from '@/components/ui/progress';
import { Event as ApiEvent, Report } from '@/services/api';
import { Label } from '@/components/ui/label';
import { ChartNoAxesColumnIncreasing, Text, Target } from 'lucide-react'; // Add this import

interface EventListProps {
  events: ApiEvent[];
  eventReports: { [key: string]: Report | null };
  isGeneratingEventReport: { [key: string]: boolean };
  eventReportProgress: { [key: string]: number };
  eventReportErrors: { [key: string]: string | null };
  onGenerateEventReport: (eventId: string) => Promise<void>;
  isAnyReportGenerating: boolean;
  singleColumn?: boolean;
}

export const EventList: React.FC<EventListProps> = ({
  events,
  eventReports,
  isGeneratingEventReport,
  eventReportProgress,
  eventReportErrors,
  onGenerateEventReport,
  isAnyReportGenerating,
  singleColumn = false,
}) => {
  const renderEvent = (event: ApiEvent) => (
    <Accordion key={event.id} type="single" collapsible className="w-full" data-testid="event-accordion-item">
      <AccordionItem value={event.id}>
        <AccordionTrigger className="flex justify-between items-center">
          <div className="flex-1 text-center">
            <span>{event.title}</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-6">
            {/* Relevance Score */}
            <div>
              <Label className="font-semibold block mb-2 flex items-center">
                <ChartNoAxesColumnIncreasing className="w-5 h-5 mr-2" /> Relevance Score:
              </Label>
              <p className="bg-white p-3 rounded-md border border-gray-200">{event.relevance_score} / 5</p>
            </div>

            {/* Event Summary */}
            <div>
              <Label className="font-semibold block mb-2 flex items-center">
                <Text className="w-5 h-5 mr-2" /> Event Summary:
              </Label>
              <p className="bg-white p-3 rounded-md border border-gray-200">{event.event_summary}</p>
            </div>

            {/* Relevance Rationale */}
            <div>
              <Label className="font-semibold block mb-2 flex items-center">
                <Target className="w-5 h-5 mr-2" /> Relevance Rationale:
              </Label>
              <p className="bg-white p-3 rounded-md border border-gray-200">{event.relevance_rationale}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 mt-6">
              <ArticleDialog event={event} testId="article-dialog-button" />
              <div className="relative flex-grow">
                <ReportDialog
                  report={eventReports[event.id]}
                  isLoading={isGeneratingEventReport[event.id] || false}
                  onGenerate={() => onGenerateEventReport(event.id)}
                  error={eventReportErrors[event.id] || null}
                  title={`Event Report`}
                  onClose={() => { }}
                  progress={eventReportProgress[event.id] || 0}
                  autoGenerateOnOpen={false}
                  buttonText={eventReports[event.id] ? "View Report" : "Generate Report"}
                  canOpen={!isAnyReportGenerating}
                  testId="report-dialog-button"
                />
                {isGeneratingEventReport[event.id] && (
                  <div className="mt-2">
                    <Progress className="w-full" value={eventReportProgress[event.id] || 0} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <div className="mt-4">
      {singleColumn ? (
        <div className="space-y-4">
          {events.map(renderEvent)}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row">
          <div className="lg:w-1/2 lg:pr-2 space-y-4">
            {events.slice(0, Math.ceil(events.length / 2)).map(renderEvent)}
          </div>
          <div className="lg:w-1/2 lg:pl-2 space-y-4 mt-4 lg:mt-0">
            {events.slice(Math.ceil(events.length / 2)).map(renderEvent)}
          </div>
        </div>
      )}
    </div>
  );
};