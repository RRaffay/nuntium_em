// hooks/useChat.ts
import { useState } from 'react';
import { CountryMetrics, api } from '@/services/api';

interface Message {
  content: string;
  sender: 'user' | 'model';
  isLoading?: boolean;
}

interface UseChatResult {
  userQuestion: string;
  setUserQuestion: (question: string) => void;
  loadingAnswer: boolean;
  messages: Message[];
  handleSubmitQuestion: (params: {
    country: string;
    selectedMetrics: string[];
    metrics: CountryMetrics | null;
    startDate?: Date;
    endDate?: Date;
  }) => Promise<void>;
  clearChatHistory: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

export function useChat(): UseChatResult {
  const [userQuestion, setUserQuestion] = useState('');
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleSubmitQuestion = async ({
    country,
    selectedMetrics,
    metrics,
    startDate,
    endDate,
  }: {
    country: string;
    selectedMetrics: string[];
    metrics: CountryMetrics | null;
    startDate?: Date;
    endDate?: Date;
  }) => {
    if (!userQuestion.trim()) return;
    setLoadingAnswer(true);
    const userMessage: Message = { content: userQuestion, sender: 'user' };
    const loadingMessage: Message = { content: '', sender: 'model', isLoading: true };
    setMessages((prevMessages) => [...prevMessages, userMessage, loadingMessage]);
    setUserQuestion('');

    try {
      const selectedData = selectedMetrics.reduce((acc, metricKey) => {
        const metricData = metrics?.[metricKey]?.data || [];
        const filteredData = metricData.filter((dp) => {
          const dpDate = new Date(dp.date);
          const startTime = startDate ? startDate.getTime() : -Infinity;
          const endTime = endDate ? endDate.getTime() : Infinity;
          return dpDate.getTime() >= startTime && dpDate.getTime() <= endTime;
        });
        acc[metricKey] = {
          ...metrics?.[metricKey],
          data: filteredData,
          label: metrics?.[metricKey]?.label || '',
          unit: metrics?.[metricKey]?.unit || '',
          source: metrics?.[metricKey]?.source || '',
          description: metrics?.[metricKey]?.description || '',
        };
        return acc;
      }, {} as CountryMetrics);

      const response = await api.submitDataQuestion(country, selectedData, userQuestion, messages);
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { content: response.answer, sender: 'model' },
      ]);
    } catch (error) {
      console.error('Error submitting question:', error);
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { content: 'An error occurred while processing your question.', sender: 'model' },
      ]);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const clearChatHistory = () => {
    setMessages([]);
  };

  return {
    userQuestion,
    setUserQuestion,
    loadingAnswer,
    messages,
    handleSubmitQuestion,
    clearChatHistory,
    isChatOpen,
    setIsChatOpen,
  };
}
