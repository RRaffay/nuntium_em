import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { api, ChatMessage } from '@/services/api';
import { btoa } from 'abab';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';
import { Trash2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReportChatInterfaceProps {
  report: string;
  onClose: () => void;
  proMode: boolean;
  setProMode: (mode: boolean) => void;
  isMobile: boolean;
}

interface Message extends ChatMessage {
  isLoading?: boolean;
}

export const ReportChatInterface: React.FC<ReportChatInterfaceProps> = ({
  report,
  onClose,
  proMode,
  isMobile,
  setProMode
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { content: inputValue, sender: 'user' };
    const loadingMessage: Message = { content: '', sender: 'model', isLoading: true };
    setMessages([...messages, userMessage, loadingMessage]);
    setInputValue('');
    setRateLimitError(null);

    try {
      const encodedReport = btoa(encodeURIComponent(report)) ?? '';
      const response = await api.sendChatMessage(
        inputValue,
        encodedReport,
        messages.filter(m => !m.isLoading),
        proMode
      );
      setMessages(prevMessages => [
        ...prevMessages.slice(0, -1),
        { content: response, sender: 'model' }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
        setRateLimitError(error.message);
      } else {
        setMessages(prevMessages => [
          ...prevMessages.slice(0, -1),
          { content: 'An error occurred while processing your request.', sender: 'model' }
        ]);
      }
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
    setRateLimitError(null);
  };

  return (
    <div className={`flex flex-col ${isMobile ? 'h-[50vh]' : 'h-full'}`}>
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="pro-mode"
                    checked={proMode}
                    onCheckedChange={setProMode}
                  />
                  <Label htmlFor="pro-mode">Pro Mode</Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Enables advanced features and more detailed responses. May incur additional time.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button onClick={clearChatHistory} variant="outline" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-grow overflow-y-auto p-4">
        <ChatMessageList>
          {messages.map((message, index) => (
            <ChatBubble
              key={index}
              variant={message.sender === 'user' ? 'sent' : 'received'}
              className="max-w-[80%]"
            >
              <ChatBubbleAvatar
                fallback={message.sender === 'user' ? 'U' : 'A'}
                variant={message.sender === 'user' ? 'sent' : 'received'}
              />
              <ChatBubbleMessage
                className="w-full"
                variant={message.sender === 'user' ? 'sent' : 'received'}
              >
                {message.isLoading ? (
                  <MessageLoading />
                ) : message.sender === 'user' ? (
                  message.content
                ) : (
                  <MarkdownContent content={message.content} useMathPlugins={true} />
                )}
              </ChatBubbleMessage>
            </ChatBubble>
          ))}
        </ChatMessageList>
      </div>
      <div className="p-4 border-t">
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSend={handleSendMessage}
          placeholder="Type your message..."
          className="mb-2"
        />
        <Button onClick={handleSendMessage} disabled={!inputValue.trim()}>
          Send
        </Button>
      </div>
      {rateLimitError && (
        <div className="p-2 bg-red-100 text-red-700 mb-2">
          {rateLimitError}
        </div>
      )}
    </div>
  );
};