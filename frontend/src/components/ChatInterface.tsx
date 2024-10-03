import React from 'react';
import { Button } from "@/components/ui/button";
import { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { MarkdownContent } from '@/components/MarkdownContent';
import MessageLoading from '@/components/ui/chat/message-loading';
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

export interface Message {
    content: string;
    sender: 'user' | 'model';
    isLoading?: boolean;
}

interface ChatInterfaceProps {
    messages: Message[];
    inputValue: string;
    setInputValue: (value: string) => void;
    handleSendMessage: () => void;
    clearChatHistory: () => void;
    proMode: boolean;
    setProMode: (mode: boolean) => void;
    isSmallScreen: boolean;
    isLoading: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
    messages,
    inputValue,
    setInputValue,
    handleSendMessage,
    clearChatHistory,
    proMode,
    setProMode,
    isSmallScreen,
    isLoading,
}) => {
    const { ref: chatContainerRef, scrollToLastNonUserMessage } = useAutoScroll<HTMLDivElement>([messages]);

    return (
        <div className={`flex flex-col ${isSmallScreen ? 'h-[50vh]' : 'h-full'}`}>
            <div className="p-2 border-b flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex items-center space-x-2" data-testid="pro-mode-switch">
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
                <div data-testid="clear-chat-button">
                    <Button onClick={clearChatHistory} variant="outline" size="icon" >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
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
                <div data-testid="chat-input">
                    <ChatInput
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onSend={handleSendMessage}
                        placeholder="Type your message..."
                        className="mb-2"
                        disabled={isLoading}
                    />
                </div>
                <div data-testid="send-button">
                    <Button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
                        Send
                    </Button>
                </div>
            </div>
        </div>
    );
};