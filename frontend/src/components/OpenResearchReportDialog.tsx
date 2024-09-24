import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, Report } from '@/services/api'; // Import Report type
import { ReportDialog } from '@/components/ReportDialog';

interface OpenResearchReportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    country: string;
}

export const OpenResearchReportDialog: React.FC<OpenResearchReportDialogProps> = ({ isOpen, onClose, country }) => {
    const [task, setTask] = useState('');
    const [questions, setQuestions] = useState<string[]>([]);
    const [answers, setAnswers] = useState<string[]>([]);
    const [step, setStep] = useState(0);
    const [report, setReport] = useState<Report | null>(null); // Change type to Report | null
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateQuestions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const generatedQuestions = await api.generateClarifyingQuestions(task);
            console.log('Generated questions:', generatedQuestions); // Add this line for debugging
            if (generatedQuestions.length === 0) {
                throw new Error('No questions were generated');
            }
            setQuestions(generatedQuestions.map(q => q.question));
            setAnswers(new Array(generatedQuestions.length).fill(''));
            setStep(1);
        } catch (err) {
            console.error('Error generating questions:', err);
            setError('Failed to generate questions. Please try again.');
        }
        setIsLoading(false);
    };

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const reportContent = await api.createOpenResearchReport({ task, questions, answers });
            setReport(reportContent); // This should now work correctly
            setStep(2);
        } catch (err) {
            setError('Failed to generate report. Please try again.');
        }
        setIsLoading(false);
    };

    const renderContent = () => {
        switch (step) {
            case 0:
                return (
                    <>
                        <Label htmlFor="task">Research Task</Label>
                        <Input
                            id="task"
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            placeholder="Enter your research task"
                        />
                        <Button onClick={handleGenerateQuestions} disabled={!task || isLoading}>
                            Generate Questions
                        </Button>
                    </>
                );
            case 1:
                return (
                    <>
                        {questions.map((question, index) => (
                            <div key={index} className="mb-4">
                                <Label htmlFor={`answer-${index}`}>{question}</Label>
                                <Input
                                    id={`answer-${index}`}
                                    value={answers[index]}
                                    onChange={(e) => {
                                        const newAnswers = [...answers];
                                        newAnswers[index] = e.target.value;
                                        setAnswers(newAnswers);
                                    }}
                                    placeholder="Enter your answer"
                                />
                            </div>
                        ))}
                        <Button onClick={handleGenerateReport} disabled={answers.some(a => !a) || isLoading}>
                            Generate Report
                        </Button>
                    </>
                );
            case 2:
                return (
                    <ReportDialog
                        report={report!}
                        isLoading={false}
                        onGenerate={async () => { }} // Change to async function
                        error={null}
                        title={`Open Research Report: ${task}`}
                        onClose={onClose}
                        progress={100}
                        buttonText="Close"
                        canOpen={true}
                    />
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Open Research Report for {country}</DialogTitle>
                </DialogHeader>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};