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
          <div className="flex gap-2">
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
                  <MarkdownContent content={report.content} />
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
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
};