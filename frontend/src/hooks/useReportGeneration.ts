import { useState } from 'react';
import { api, Report } from '@/services/api';

export const useReportGeneration = (country: string | undefined) => {
  const [countryReport, setCountryReport] = useState<Report | null>(null);
  const [eventReports, setEventReports] = useState<{ [key: string]: Report | null }>({});
  const [isGeneratingCountryReport, setIsGeneratingCountryReport] = useState(false);
  const [isGeneratingEventReport, setIsGeneratingEventReport] = useState<{ [key: string]: boolean }>({});
  const [countryReportError, setCountryReportError] = useState<string | null>(null);
  const [eventReportErrors, setEventReportErrors] = useState<{ [key: string]: string | null }>({});
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [countryReportProgress, setCountryReportProgress] = useState<number>(0);
  const [eventReportProgress, setEventReportProgress] = useState<{ [key: string]: number }>({});
  const [isAnyReportGenerating, setIsAnyReportGenerating] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [openResearchReport, setOpenResearchReport] = useState<Report | null>(null);
  const [isGeneratingOpenResearchReport, setIsGeneratingOpenResearchReport] = useState(false);
  const [openResearchReportError, setOpenResearchReportError] = useState<string | null>(null);

  const handleGenerateCountryReport = async () => {
    if (isAnyReportGenerating) {
      setShowAlertDialog(true);
      return;
    }
    if (!country) return;
    if (isGeneratingCountryReport) return;
    setIsAnyReportGenerating(true);
    setIsGeneratingCountryReport(true);
    setCountryReportError(null);
    setRateLimitError(null);
    setCountryReportProgress(0);

    const startTime = Date.now();
    const duration = 210000;
    const easeOutQuad = (t: number) => t * (2 - t);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setCountryReportProgress(progressValue);

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100);

    try {
      const generatedReport = await api.generateCountryReport(country);
      setCountryReport(generatedReport);
    } catch (err) {
      console.error('Error generating country report:', err);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setCountryReportError('Failed to generate country report. Please try again.');
      }
      setCountryReport(null);
    } finally {
      clearInterval(interval);
      setCountryReportProgress(100);
      setIsGeneratingCountryReport(false);
      setIsAnyReportGenerating(false);
    }
  };

  const handleGenerateEventReport = async (eventId: string) => {
    if (isAnyReportGenerating) {
      setShowAlertDialog(true);
      return;
    }
    if (!country) return;
    if (isGeneratingEventReport[eventId]) return;
    setIsAnyReportGenerating(true);
    setIsGeneratingEventReport((prev) => ({ ...prev, [eventId]: true }));
    setEventReportErrors((prev) => ({ ...prev, [eventId]: null }));
    setRateLimitError(null);
    setEventReportProgress((prev) => ({ ...prev, [eventId]: 0 }));

    const startTime = Date.now();
    const duration = 210000;
    const easeOutQuad = (t: number) => t * (2 - t);

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progressValue = easeOutQuad(Math.min(elapsed / duration, 1)) * 100;
      setEventReportProgress((prev) => ({ ...prev, [eventId]: progressValue }));

      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 100);

    try {
      const generatedReport = await api.generateEventReport(country, eventId);
      setEventReports((prev) => ({ ...prev, [eventId]: generatedReport }));
    } catch (err) {
      console.error('Error generating event report:', err);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setEventReportErrors((prev) => ({
          ...prev,
          [eventId]: 'Failed to generate event report. Please try again.',
        }));
      }
      setEventReports((prev) => ({ ...prev, [eventId]: null }));
    } finally {
      clearInterval(interval);
      setEventReportProgress((prev) => ({ ...prev, [eventId]: 100 }));
      setIsGeneratingEventReport((prev) => ({ ...prev, [eventId]: false }));
      setIsAnyReportGenerating(false);
    }
  };

  const handleGenerateOpenResearchReport = async (task: string, questions: string[], answers: string[]) => {
    if (isAnyReportGenerating) {
      setShowAlertDialog(true);
      return;
    }
    setIsAnyReportGenerating(true);
    setIsGeneratingOpenResearchReport(true);
    setOpenResearchReportError(null);
    setRateLimitError(null);

    try {
      const generatedReport = await api.createOpenResearchReport({ task, questions, answers });
      setOpenResearchReport(generatedReport);
    } catch (err) {
      console.error('Error generating open research report:', err);
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        setRateLimitError(err.message);
      } else {
        setOpenResearchReportError('Failed to generate open research report. Please try again.');
      }
      setOpenResearchReport(null);
    } finally {
      setIsGeneratingOpenResearchReport(false);
      setIsAnyReportGenerating(false);
    }
  };

  return {
    countryReport,
    eventReports,
    handleGenerateCountryReport,
    handleGenerateEventReport,
    isGeneratingCountryReport,
    isGeneratingEventReport,
    countryReportProgress,
    eventReportProgress,
    countryReportError,
    eventReportErrors,
    rateLimitError,
    isAnyReportGenerating,
    showAlertDialog,
    setShowAlertDialog,
    openResearchReport,
    isGeneratingOpenResearchReport,
    openResearchReportError,
    handleGenerateOpenResearchReport,
  };
};