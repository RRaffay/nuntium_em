import React from 'react';
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Trash2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutoScroll } from '@/hooks/useAutoScroll';

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
    clearChatHistory: () => void;
    proMode: boolean;
    setProMode: (mode: boolean) => void;
}

export const QuestionSection: React.FC<QuestionSectionProps> = ({
    messages,
    userQuestion,
    setUserQuestion,
    handleSubmitQuestion,
    loadingAnswer,
    clearChatHistory,
    proMode,
    setProMode,
}) => {
    const isSmallScreen = useMediaQuery('(max-width: 768px)');

    const { ref: chatContainerRef, scrollToLastNonUserMessage } = useAutoScroll<HTMLDivElement>([messages]);

    return (
        <div className={`flex flex-col ${isSmallScreen ? 'h-[50vh]' : 'h-full'}`}>
            <div className="p-2 border-b flex justify-between items-center">
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
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto p-4">
                <ChatMessageList>
                    {messages.map((message, index) => (
                        <ChatBubble
                            key={index}
                            variant={message.sender === 'user' ? 'sent' : 'received'}
                            className="max-w-[80%]"
                            data-message-type={message.sender}
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
                <Button onClick={handleSubmitQuestion} disabled={!userQuestion.trim() || loadingAnswer}>
                    Send
                </Button>
            </div>
        </div>
    );
};