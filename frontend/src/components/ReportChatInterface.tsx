import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { api } from '@/services/api';
import { btoa } from 'abab';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';

interface ReportChatInterface {
  report: string;
  onClose: () => void;
}

interface Message {
  content: string;
  isUser: boolean;
  isLoading?: boolean;
}

export const ReportChatInterface: React.FC<ReportChatInterface> = ({ report, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { content: inputValue, isUser: true };
    const loadingMessage: Message = { content: '', isUser: false, isLoading: true };
    setMessages([...messages, userMessage, loadingMessage]);
    setInputValue('');

    try {
      const encodedReport = btoa(encodeURIComponent(report)) ?? '';
      const response = await api.sendChatMessage(inputValue, encodedReport);
      setMessages(prevMessages => [
        ...prevMessages.slice(0, -1),
        { content: response, isUser: false }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prevMessages => [
        ...prevMessages.slice(0, -1),
        { content: 'An error occurred while processing your request.', isUser: false }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <ChatMessageList>
          {messages.map((message, index) => (
            <ChatBubble key={index} variant={message.isUser ? 'sent' : 'received'}>
              <ChatBubbleAvatar fallback={message.isUser ? 'U' : 'N'} />
              <ChatBubbleMessage>
                {message.isLoading ? (
                  <MessageLoading />
                ) : message.isUser ? (
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
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..."
          className="flex-grow mr-2"
        />
        <Button onClick={handleSendMessage}>Send</Button>
      </div>
    </div>
  );
};