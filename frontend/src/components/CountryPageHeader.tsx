import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CountryData, UserProfile, Report } from '@/services/api';
import { Button } from '@/components/ui/button';
import { OpenResearchReportDialog } from '@/components/OpenResearchReportDialog';
import { Clock, Calendar, FileText, User, BarChart2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

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
  metricsCount: number;
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
  onGenerateOpenResearchReport,
  metricsCount // Add this line
}) => {
  const [isOpenResearchDialogOpen, setIsOpenResearchDialogOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 640px)'); // Add this line

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800">{countryData.country}</h2>
        <Button
          onClick={() => setIsOpenResearchDialogOpen(true)}
        >
          Generate Open Research Report
        </Button>
      </div>
      <div className={`grid ${isSmallScreen ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'} gap-4`}>
        <InfoItem
          icon={<Calendar className="w-5 h-5 text-gray-500" />}
          label="Last updated"
          value={new Date(countryData.timestamp).toLocaleString() + " UTC"}
          tooltip="The most recent time the data was refreshed"
        />
        <InfoItem
          icon={<Clock className="w-5 h-5 text-gray-500" />}
          label="Hours of data"
          value={countryData.hours.toString()}
          tooltip="The time range of collected data in hours"
        />
        <InfoItem
          icon={<FileText className="w-5 h-5 text-gray-500" />}
          label="Events Found"
          value={countryData.no_relevant_events.toString()}
          tooltip="The number of relevant events detected in this time period"
        />
        <InfoItem
          icon={<BarChart2 className="w-5 h-5 text-gray-500" />}
          label="Available Indicators"
          value={metricsCount.toString()}
          tooltip="The number of economic indicators available for this country"
        />
        {userProfile && (
          <InfoItem
            icon={<User className="w-5 h-5 text-gray-500" />}
            label="Your Area of Interest"
            value={userProfile.area_of_interest}
            tooltip="Your specified area of interest to be used for generating reports. To change, update your profile."
          />
        )}

      </div>
      <OpenResearchReportDialog
        isOpen={isOpenResearchDialogOpen}
        onClose={() => setIsOpenResearchDialogOpen(false)}
        country={countryData.country}
      />
    </div>
  );
};

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tooltip: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, tooltip }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-start space-x-3 p-3 bg-white rounded-md">
          <div className="mt-1">{icon}</div>
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-sm font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);