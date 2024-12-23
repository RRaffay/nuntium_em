import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Event } from '@/services/api';
import { MarkdownContent } from '@/components/MarkdownContent';

interface ArticleDialogProps {
  event: Event;
  testId?: string;
}

export const ArticleDialog: React.FC<ArticleDialogProps> = ({ event, testId }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div data-testid={testId}>
          <Button variant="outline">View Articles</Button>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[50%]">
        <DialogHeader>
          <DialogTitle>Articles</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {event.articles.map((article, index) => (
            <div key={index} className="mb-4 p-4 border rounded">
              <p className="font-semibold mb-2">Summary:</p>
              <MarkdownContent content={article.summary} />
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Read full article
              </a>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};