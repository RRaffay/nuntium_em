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
import { MessageSquare } from 'lucide-react';

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
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ report, isLoading, onGenerate, error, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={handleGenerate}>{title}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          {report && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              <MessageSquare className="h-4 w-4" />
            </Button>
          )}
        </DialogHeader>
        <div className="flex-grow flex overflow-hidden">
          <div className={`flex-grow overflow-y-auto transition-all ${isChatOpen ? 'w-1/2' : 'w-full'}`}>
            {isLoading ? (
              <div className="p-4">
                <p>Generating Report</p>
                <Progress value={progress} className="mt-2" />
              </div>
            ) : error ? (
              <p className="text-red-500 p-4">{error}</p>
            ) : report ? (
              <div className="p-4">
                <MarkdownContent content={report.content} />
                <p className="text-sm text-gray-500 mt-4">Generated at: {new Date(report.generated_at).toLocaleString()}</p>
                <Button onClick={() => downloadReport(report.content, `${title}.md`)} className="mt-4">Download Report</Button>
              </div>
            ) : (
              <p className="p-4">No report generated. Please try again.</p>
            )}
          </div>
          {isChatOpen && report && (
            <div className="w-1/2 border-l">
              <ReportChatInterface
                report={report.content}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};