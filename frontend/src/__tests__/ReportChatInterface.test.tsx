import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { ReportChatInterface } from '@/components/ReportChatInterface';
import { api } from '@/services/api';
import { useMediaQuery } from '@/hooks/useMediaQuery';

jest.mock('@/services/api');
jest.mock('@/hooks/useMediaQuery', () => ({
    useMediaQuery: jest.fn().mockReturnValue(false),
}));

// Mock MarkdownContent
jest.mock('@/components/MarkdownContent', () => ({
    MarkdownContent: ({ content }: { content: string }) => (
        <div data-testid="markdown-content">{content}</div>
    ),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Add this mock for MessageLoading
jest.mock('@/components/ui/chat/message-loading', () => ({
    __esModule: true,
    default: () => <div data-testid="message-loading">Loading...</div>,
}));

// Mock useAutoScroll
jest.mock('@/hooks/useAutoScroll', () => ({
    useAutoScroll: () => ({
        ref: { current: null },
        scrollToLastNonUserMessage: jest.fn(),
    }),
}));

describe('ReportChatInterface', () => {
    const mockOnClose = jest.fn();
    const mockSetProMode = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly', () => {
        (useMediaQuery as jest.Mock).mockReturnValue(false);
        render(
            <ReportChatInterface
                report="Test report content"
                onClose={mockOnClose}
                proMode={false}
                setProMode={mockSetProMode}
                isMobile={false}
            />
        );

        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
    });

    it('sends a message and displays the response', async () => {
        (api.sendChatMessage as jest.Mock).mockResolvedValue('AI response');

        render(
            <ReportChatInterface
                report="Test report content"
                onClose={mockOnClose}
                proMode={false}
                setProMode={mockSetProMode}
                isMobile={false}
            />
        );

        const input = screen.getByPlaceholderText('Type your message...');
        const sendButton = screen.getByRole('button', { name: 'Send' });

        fireEvent.change(input, { target: { value: 'Hello AI' } });
        fireEvent.click(sendButton);

        // Check for loading
        expect(screen.getByTestId('message-loading')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Hello AI')).toBeInTheDocument();
            expect(screen.getByText('AI response')).toBeInTheDocument();
        });

        expect(api.sendChatMessage).toHaveBeenCalledWith(
            'Hello AI',
            expect.any(String),
            [],
            false
        );
    });

    it('toggles pro mode', () => {
        render(
            <ReportChatInterface
                report="Test report content"
                onClose={mockOnClose}
                proMode={false}
                setProMode={mockSetProMode}
                isMobile={false}
            />
        );

        const proModeSwitch = screen.getByRole('switch', { name: 'Pro Mode' });
        fireEvent.click(proModeSwitch);

        expect(mockSetProMode).toHaveBeenCalledWith(true);
    });

    it('clears chat history', () => {
        render(
            <ReportChatInterface
                report="Test report content"
                onClose={mockOnClose}
                proMode={false}
                setProMode={mockSetProMode}
                isMobile={false}
            />
        );

        const clearButton = screen.getByRole('button', { name: '' });
        fireEvent.click(clearButton);

        // Since we're clearing the chat, we should expect no chat messages
        expect(screen.queryByTestId('chat-message')).not.toBeInTheDocument();
    });
});