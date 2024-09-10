import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { api, ChatMessage } from '@/services/api';
import { btoa } from 'abab';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';

interface ReportChatInterface {
  report: string;
  onClose: () => void;
}

interface Message extends ChatMessage {
  isLoading?: boolean;
}

export const ReportChatInterface: React.FC<ReportChatInterface> = ({ report, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

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
        messages.filter(m => !m.isLoading)
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <ChatMessageList>
          {messages.map((message, index) => (
            <ChatBubble 
              key={index} 
              variant={message.sender === 'user' ? 'sent' : 'received'}
              className="max-w-[80%]" 
            >
              <ChatBubbleAvatar 
                fallback={message.sender === 'user' ? 'U' : 'N'} 
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
                  <MarkdownContent content={message.content} />
                )}
              </ChatBubbleMessage>
            </ChatBubble>
          ))}
        </ChatMessageList>
      </div>
      <div className="p-4 border-t flex">
        <ChatInput
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onSend={handleSendMessage}
          placeholder="Type your message..."
          className="flex-grow mr-2"
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
      {rateLimitError && (
        <div className="p-2 bg-red-100 text-red-700 mb-2">
          {rateLimitError}
        </div>
      )}
    </div>
  );
};