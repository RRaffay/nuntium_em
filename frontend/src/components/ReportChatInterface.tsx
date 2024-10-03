import React, { useState } from 'react';
import { api } from '@/services/api';
import { btoa } from 'abab';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { ChatInterface, Message } from '@/components/ChatInterface';

interface ReportChatInterfaceProps {
  report: string;
  onClose: () => void;
  proMode: boolean;
  setProMode: (mode: boolean) => void;
  isMobile: boolean;
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
  const [isLoading, setIsLoading] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
    setRateLimitError(null);
  };

  return (
    <>
      <ChatInterface
        messages={messages}
        inputValue={inputValue}
        setInputValue={setInputValue}
        handleSendMessage={handleSendMessage}
        clearChatHistory={clearChatHistory}
        proMode={proMode}
        setProMode={setProMode}
        isSmallScreen={isSmallScreen}
        isLoading={isLoading}
      />
      {rateLimitError && (
        <div className="p-2 bg-red-100 text-red-700 mb-2">
          {rateLimitError}
        </div>
      )}
    </>
  );
};