import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { ReportDialog, ReportDialogRef } from '../components/ReportDialog';

const defaultProps = {
    report: null,
    isLoading: false,
    onGenerate: jest.fn(),
    error: null,
    title: 'Test Report',
    onClose: jest.fn(),
    progress: 50,
    buttonText: 'Generate Report',
    canOpen: true,
};

// Mock MarkdownContent
jest.mock('@/components/MarkdownContent', () => ({
    MarkdownContent: ({ content }: { content: string }) => (
        <div data-testid="markdown-content">{content}</div>
    ),
}));

describe('ReportDialog', () => {

    it('displays loading state', async () => {
        const ref = React.createRef<ReportDialogRef>();
        render(<ReportDialog {...defaultProps} isLoading={true} ref={ref} />);

        expect(screen.getByRole('button', { name: 'Generating...' })).toBeDisabled();

        await act(async () => {
            ref.current?.openDialog();
        });

        await waitFor(() => {
            const dialogContent = screen.getByTestId('report-dialog-content');
            expect(dialogContent).toBeInTheDocument();
            expect(within(dialogContent).getByText('Generating Report')).toBeInTheDocument();
            expect(within(dialogContent).getByText('50%')).toBeInTheDocument();
        });
    });

    it('displays error message', async () => {
        const ref = React.createRef<ReportDialogRef>();
        render(<ReportDialog {...defaultProps} error="Failed to generate report" report={{} as Report} ref={ref} />);

        await act(async () => {
            ref.current?.openDialog();
        });

        await waitFor(() => {
            const dialogContent = screen.getByTestId('report-dialog-content');
            expect(dialogContent).toBeInTheDocument();
            expect(within(dialogContent).getByText('Failed to generate report')).toBeInTheDocument();
        });
    });
});