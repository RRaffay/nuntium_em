import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CountryData, UserProfile, Report } from '@/services/api';
import { Button } from '@/components/ui/button';
import { OpenResearchReportDialog } from '@/components/OpenResearchReportDialog';


interface CountryPageHeaderProps {
  countryData: CountryData;
  userProfile: UserProfile | null;
  onGenerateReport: () => Promise<void>;
  onBackToDashboard: () => void;
  countryReport: Report | null;
  isGeneratingCountryReport: boolean;
  countryReportProgress: number;
  countryReportError: string | null;
  isAnyReportGenerating: boolean;
  openResearchReport: Report | null;
  isGeneratingOpenResearchReport: boolean;
  openResearchReportError: string | null;
  onGenerateOpenResearchReport: (task: string, questions: string[], answers: string[]) => Promise<void>;
}

export const CountryPageHeader: React.FC<CountryPageHeaderProps> = ({
  countryData,
  userProfile,
  onGenerateReport,
  onBackToDashboard,
  countryReport,
  isGeneratingCountryReport,
  countryReportProgress,
  countryReportError,
  isAnyReportGenerating,
  openResearchReport,
  isGeneratingOpenResearchReport,
  openResearchReportError,
  onGenerateOpenResearchReport
}) => {
  const [isOpenResearchDialogOpen, setIsOpenResearchDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl md:text-3xl font-bold">Events in {countryData.country}</h2>
        <Button onClick={() => setIsOpenResearchDialogOpen(true)}>
          Generate Open Research Report
        </Button>
      </div>
      <TooltipProvider>
        <div className="space-y-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-base">Last updated: <strong>{new Date(countryData.timestamp).toLocaleString()} UTC</strong></p>
            </TooltipTrigger>
            <TooltipContent align="start">
              <p>The most recent time the data was refreshed</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-base">Hours of data: <strong>{countryData.hours}</strong></p>
            </TooltipTrigger>
            <TooltipContent align="start">
              <p>The time range of collected data in hours</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-base">Events Found: <strong>{countryData.no_relevant_events}</strong></p>
            </TooltipTrigger>
            <TooltipContent align="start">
              <p>The number of relevant events detected in this time period</p>
            </TooltipContent>
          </Tooltip>
          {userProfile && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-base">Your Area of Interest: <strong>{userProfile.area_of_interest}</strong></p>
              </TooltipTrigger>
              <TooltipContent align="start">
                <p>Your specified area of interest to be used for generating reports. To change, update your profile.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
      <OpenResearchReportDialog
        isOpen={isOpenResearchDialogOpen}
        onClose={() => setIsOpenResearchDialogOpen(false)}
        country={countryData.country}
      />
    </div>
  );
};