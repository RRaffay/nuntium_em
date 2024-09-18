import React, { useState } from 'react';
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
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ report, isLoading, onGenerate, error, title, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSize, setChatSize] = useState(50);
  const [proMode, setProMode] = useState(false);

  const easeOutQuad = (t: number) => t * (2 - t);

  const handleGenerate = async () => {
    setProgress(0);
    setIsOpen(true);
    const startTime = Date.now();
    const duration = 210000; // 210 seconds

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setProgress(progressValue);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100); // Update every 100ms

    await onGenerate();
    clearInterval(interval);
    setProgress(100);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Reset state when dialog is closed
      setProgress(0);
      setIsChatOpen(false);
      setChatSize(50);
      onClose(); // Call the onClose prop
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button onClick={handleGenerate}>{title}</Button>
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
                            "mt-2 px-3 py-1",
                            proMode
                              ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
                              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                          )}
                        >
                          PRO: {proMode ? "Activated" : "Deactivated"}
                        </Toggle>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Pro mode: {proMode ? "Activated" : "Deactivated"}. Responses might take longer but will be more researched and analysis-heavy when active.</p>
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
                </div>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : report ? (
                <>
                  <MarkdownContent content={report.content} useMathPlugins={false} />
                  <p className="text-sm text-gray-500 mt-4">Generated at: {new Date(report.generated_at).toLocaleString()}</p>
                </>
              ) : (
                <p>No report generated. Please try again.</p>
              )}
            </div>
          </ResizablePanel>
          {isChatOpen && report && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={chatSize} minSize={30} onResize={(size) => setChatSize(size)}>
                <ReportChatInterface
                  report={report.content}
                  onClose={() => setIsChatOpen(false)}
                  proMode={proMode}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
};