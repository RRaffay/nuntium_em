import React from 'react';
import { Button } from "@/components/ui/button";

interface QuestionSectionProps {
    userQuestion: string;
    setUserQuestion: (question: string) => void;
    handleSubmitQuestion: () => void;
    loadingAnswer: boolean;
    answer: string | null;
}

export const QuestionSection: React.FC<QuestionSectionProps> = ({
    userQuestion,
    setUserQuestion,
    handleSubmitQuestion,
    loadingAnswer,
    answer,
}) => {
    return (
        <div className="mt-6">
            <label htmlFor="user-question" className="block mb-2">Ask a question about the selected data:</label>
            <textarea
                id="user-question"
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                rows={4}
                className="w-full border p-2 rounded mb-2"
                placeholder="Type your question here..."
            />
            <Button onClick={handleSubmitQuestion} disabled={!userQuestion.trim()}>
                Submit Question
            </Button>

            {loadingAnswer && <div className="mt-4">Processing your question...</div>}
            {answer && (
                <div className="mt-4">
                    <h4 className="font-semibold mb-2">Answer:</h4>
                    <p>{answer}</p>
                </div>
            )}
        </div>
    );
};