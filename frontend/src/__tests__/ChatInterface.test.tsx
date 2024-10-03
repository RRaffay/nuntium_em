import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { ChatInterface } from '@/components/ChatInterface';
import { useAutoScroll } from '@/hooks/useAutoScroll';

// Mock MarkdownContent
jest.mock('@/components/MarkdownContent', () => ({
    MarkdownContent: ({ content }: { content: string }) => (
        <div data-testid="markdown-content">{content}</div>
    ),
}));

// Mock useAutoScroll hook
jest.mock('@/hooks/useAutoScroll', () => ({
    useAutoScroll: jest.fn().mockReturnValue({
        ref: jest.fn(),
        scrollToLastNonUserMessage: jest.fn(),
    }),
}));

describe('ChatInterface', () => {
    const mockHandleSendMessage = jest.fn();
    const mockClearChatHistory = jest.fn();
    const mockSetInputValue = jest.fn();
    const mockSetProMode = jest.fn();

    const defaultProps = {
        messages: [],
        inputValue: '',
        setInputValue: mockSetInputValue,
        handleSendMessage: mockHandleSendMessage,
        clearChatHistory: mockClearChatHistory,
        proMode: false,
        setProMode: mockSetProMode,
        isSmallScreen: false,
        isLoading: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        render(<ChatInterface {...defaultProps} />);

        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
        expect(screen.getByRole('switch', { name: 'Pro Mode' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '' })).toBeInTheDocument(); // Clear button
    });

    it('handles input change', () => {
        render(<ChatInterface {...defaultProps} />);

        const input = screen.getByPlaceholderText('Type your message...');
        fireEvent.change(input, { target: { value: 'Hello' } });

        expect(mockSetInputValue).toHaveBeenCalledWith('Hello');
    });

    it('handles send message', () => {
        render(<ChatInterface {...defaultProps} inputValue="Hello" />);

        const sendButton = screen.getByRole('button', { name: 'Send' });
        fireEvent.click(sendButton);

        expect(mockHandleSendMessage).toHaveBeenCalled();
    });

    it('handles clear chat history', () => {
        render(<ChatInterface {...defaultProps} />);

        const clearButton = screen.getByRole('button', { name: '' });
        fireEvent.click(clearButton);

        expect(mockClearChatHistory).toHaveBeenCalled();
    });

    it('toggles pro mode', () => {
        render(<ChatInterface {...defaultProps} />);

        const proModeSwitch = screen.getByRole('switch', { name: 'Pro Mode' });
        fireEvent.click(proModeSwitch);

        expect(mockSetProMode).toHaveBeenCalledWith(true);
    });

    it('displays messages', () => {
        const messages = [
            { content: 'Hello', sender: 'user' },
            { content: 'Hi there!', sender: 'model' },
        ];

        render(<ChatInterface {...defaultProps} messages={messages} />);

        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });

    it('disables send button when input is empty', () => {
        render(<ChatInterface {...defaultProps} inputValue="" />);

        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeDisabled();
    });

    it('disables send button when loading', () => {
        render(<ChatInterface {...defaultProps} inputValue="Hello" isLoading={true} />);

        const sendButton = screen.getByRole('button', { name: 'Send' });
        expect(sendButton).toBeDisabled();
    });
});