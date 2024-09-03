import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { api } from '@/services/api';

interface ReportChatInterface {
  report: string;
  onClose: () => void;
}

interface Message {
  content: string;
  isUser: boolean;
}

export const ReportChatInterface: React.FC<ReportChatInterface> = ({ report, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { content: inputValue, isUser: true };
    setMessages([...messages, userMessage]);
    setInputValue('');

    try {
      const response = await api.sendChatMessage(inputValue, report);
      const aiMessage: Message = { content: response, isUser: false };
      setMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Handle error (e.g., show an error message to the user)
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto">
        <ChatMessageList>
          {messages.map((message, index) => (
            <ChatBubble key={index} variant={message.isUser ? 'sent' : 'received'}>
              <ChatBubbleAvatar />
              <ChatBubbleMessage>{message.content}</ChatBubbleMessage>
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