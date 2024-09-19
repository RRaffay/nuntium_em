// ReportDialog.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Report } from '@/services/api';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ReportChatInterface } from '@/components/ReportChatInterface';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from "@/lib/utils";

const downloadReport = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface ReportDialogProps {
  report: Report | null;
  isLoading: boolean;
  onGenerate: () => Promise<void>;
  error: string | null;
  title: string;
  onClose: () => void;
  progress: number;
  autoGenerateOnOpen?: boolean;
  buttonText: string;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({
  report,
  isLoading,
  onGenerate,
  error,
  title,
  onClose,
  progress,
  autoGenerateOnOpen = false,
  buttonText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSize, setChatSize] = useState(50);
  const [proMode, setProMode] = useState(false);

  useEffect(() => {
    if (isOpen && autoGenerateOnOpen && !isLoading && !report) {
      handleGenerate();
    }
  }, [isOpen, autoGenerateOnOpen, isLoading, report]);

  const handleGenerate = async () => {
    if (isLoading) return;
    await onGenerate();
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    // Do not reset progress or state when dialog is closed
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={isLoading}>
          {isLoading ? "Generating Report..." : buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex gap-2 items-center">
            {report && (
              <>
                <Button
                  variant="outline"
                  className="text-black mt-2"
                  onClick={() => downloadReport(report.content, `${title}.md`)}
                >
                  Download Report
                </Button>
                <Button
                  variant="outline"
                  className="text-black mt-2"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                >
                  {isChatOpen ? 'Hide Chat' : 'Show Chat'}
                </Button>
                {isChatOpen && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Toggle
                          aria-label="Toggle pro mode"
                          pressed={proMode}
                          onPressedChange={setProMode}
                          className={cn(
                            'mt-2 px-3 py-1',
                            proMode
                              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          )}
                        >
                          PRO: {proMode ? 'Activated' : 'Deactivated'}
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Pro mode: {proMode ? 'Activated' : 'Deactivated'}. Responses might take longer but will be
                          more researched and analysis-heavy when active.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        </DialogHeader>
        <ResizablePanelGroup direction="horizontal" className="flex-grow overflow-hidden">
          <ResizablePanel defaultSize={100 - chatSize} minSize={30}>
            <div className="h-full overflow-y-auto p-4">
              {isLoading ? (
                <div>
                  <p>Generating Report</p>
                  <Progress value={progress} className="mt-2" />
                  <p>{Math.round(progress)}%</p>
                </div>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : report ? (
                <>
                  <MarkdownContent content={report.content} useMathPlugins={false} />
                  <p className="text-sm text-gray-500 mt-4">
                    Generated at: {new Date(report.generated_at).toLocaleString()}
                  </p>
                </>
              ) : (
                !autoGenerateOnOpen && (
                  <div>
                    <p>No report generated. Please click the button below to generate the report.</p>
                    <Button onClick={handleGenerate} disabled={isLoading}>
                      Generate Report
                    </Button>
                  </div>
                )
              )}
            </div>
          </ResizablePanel>
          {isChatOpen && report && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={chatSize} minSize={30} onResize={(size) => setChatSize(size)}>
                <ReportChatInterface report={report.content} onClose={() => setIsChatOpen(false)} proMode={proMode} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
};