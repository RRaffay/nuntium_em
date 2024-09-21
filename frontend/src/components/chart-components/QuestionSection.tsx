import React from 'react';
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';

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
}

export const QuestionSection: React.FC<QuestionSectionProps> = ({
    messages,
    userQuestion,
    setUserQuestion,
    handleSubmitQuestion,
    loadingAnswer,
}) => {
    return (
        <div className="mt-6 border rounded-lg overflow-hidden">
            <div className="h-64 overflow-y-auto p-4">
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
            <div className="p-4 border-t flex items-center">
                <ChatInput
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    onSend={handleSubmitQuestion}
                    placeholder="Ask a question about the selected data..."
                    className="flex-grow mr-2"
                />
                <Button onClick={handleSubmitQuestion} disabled={!userQuestion.trim() || loadingAnswer}>
                    Send
                </Button>
            </div>
        </div>
    );
};