// components/ReportDialog.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import { Report } from '@/services/api';
import { MarkdownContent } from '@/components/MarkdownContent';
import { ReportChatInterface } from '@/components/ReportChatInterface';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { MessageCircle } from "lucide-react";
import { forwardRef, useImperativeHandle } from 'react';

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
  canOpen: boolean;
  autoOpen?: boolean;
}

export interface ReportDialogRef {
  openDialog: () => void;
}

export const ReportDialog = forwardRef<ReportDialogRef, ReportDialogProps>(({
  report,
  isLoading,
  onGenerate,
  error,
  title,
  onClose,
  progress,
  autoGenerateOnOpen = false,
  buttonText,
  canOpen,
  autoOpen = false,
}, ref) => {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatSize, setChatSize] = useState(50);
  const [proMode, setProMode] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (autoOpen && report && !isLoading) {
      setIsOpen(true);
    }
  }, [autoOpen, report, isLoading]);

  const handleOpenChange = (open: boolean) => {
    if (canOpen && report) {
      setIsOpen(open);
    } else if (!open) {
      setIsOpen(false);
    }
  };

  const handleButtonClick = () => {
    if (report) {
      setIsOpen(true);
    } else {
      onGenerate();
    }
  };

  useImperativeHandle(ref, () => ({
    openDialog: () => setIsOpen(true),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          disabled={isLoading}
          onClick={handleButtonClick}
          data-testid="report-dialog-trigger"
        >
          {isLoading ? "Generating..." : buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[95vw] h-[95vh] flex flex-col" data-testid="report-dialog-content">
        <DialogDescription className="sr-only">
          Report details and chat interface
        </DialogDescription>
        <DialogHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex flex-wrap gap-2 items-center mt-2 sm:mt-0">
            {report && (
              <>
                <Button
                  className="mt-2"
                  onClick={() => downloadReport(report.content, `${title}.md`)}
                >
                  Download Report
                </Button>
                <Button
                  className="mt-2"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {isChatOpen ? 'Hide Chat' : 'Show Chat'}
                </Button>
              </>
            )}
          </div>
        </DialogHeader>
        <ResizablePanelGroup
          direction={isMobile ? "vertical" : "horizontal"}
          className="flex-grow overflow-hidden"
        >
          <ResizablePanel
            defaultSize={isMobile ? 50 : (100 - chatSize)}
            minSize={30}
          >
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
                    <Button onClick={onGenerate} disabled={isLoading}>
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
              <ResizablePanel
                defaultSize={isMobile ? 50 : chatSize}
                minSize={30}
                onResize={(size) => !isMobile && setChatSize(size)}
              >
                <ReportChatInterface
                  report={report.content}
                  onClose={() => setIsChatOpen(false)}
                  proMode={proMode}
                  setProMode={setProMode}
                  isMobile={isMobile}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
});
