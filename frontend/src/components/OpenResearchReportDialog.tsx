import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { api } from '@/services/api';
import { ReportDialog } from '@/components/ReportDialog';
import { useReportGeneration } from '@/hooks/useReportGeneration';

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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        openResearchReport,
        isGeneratingOpenResearchReport,
        openResearchReportError,
        openResearchReportProgress,
        handleGenerateOpenResearchReport,
    } = useReportGeneration(country);

    const handleGenerateQuestions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const generatedQuestions = await api.generateClarifyingQuestions(task);
            console.log('Generated questions:', generatedQuestions);
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
            await handleGenerateOpenResearchReport(task, questions, answers);
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
                        <Label htmlFor="task">Describe your research task</Label>
                        <Textarea
                            id="task"
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            placeholder="For example, key drivers of inflation"
                            rows={4}
                        />
                        <Button onClick={handleGenerateQuestions} disabled={!task || isLoading}>
                            Begin
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
                        <Button onClick={handleGenerateReport} disabled={answers.some(a => !a) || isGeneratingOpenResearchReport}>
                            Generate Report
                        </Button>
                        {isGeneratingOpenResearchReport && (
                            <Progress value={openResearchReportProgress} className="mt-4" />
                        )}
                    </>
                );
            case 2:
                return (
                    <ReportDialog
                        report={openResearchReport!}
                        isLoading={isGeneratingOpenResearchReport}
                        onGenerate={async () => { }}
                        error={openResearchReportError}
                        title={`Open Research Report: ${task}`}
                        onClose={onClose}
                        progress={openResearchReportProgress}
                        buttonText="Open Report"
                        canOpen={!isGeneratingOpenResearchReport}
                        autoOpen={true}
                    />
                );
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Generate Report for {country}</DialogTitle>
                </DialogHeader>
                {error && <div className="text-red-500 mb-4">{error}</div>}
                {renderContent()}
            </DialogContent>
        </Dialog>
    );
};