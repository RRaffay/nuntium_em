import React from 'react';
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';
import { Trash2 } from 'lucide-react';

interface Message {
    content: string;
    sender: 'user' | 'model';
    isLoading?: boolean;
}

interface QuestionSectionProps {
    messages: Message[];
    userQuestion: string;
    setUserQuestion: (question: string) => void;
    handleSubmitQuestion: () => void;
    loadingAnswer: boolean;
    clearChatHistory: () => void; // Add this new prop
}

export const QuestionSection: React.FC<QuestionSectionProps> = ({
    messages,
    userQuestion,
    setUserQuestion,
    handleSubmitQuestion,
    loadingAnswer,
    clearChatHistory,
}) => {
    return (
        <div className="flex flex-col h-full border-l">
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
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    onSend={handleSubmitQuestion}
                    placeholder="Ask about the data..."
                    className="mb-2"
                />
                <div className="flex justify-between">
                    <Button onClick={handleSubmitQuestion} disabled={!userQuestion.trim() || loadingAnswer}>
                        Send
                    </Button>
                    <Button onClick={clearChatHistory} variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};