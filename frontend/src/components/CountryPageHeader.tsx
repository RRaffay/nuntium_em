import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CountryData, UserProfile } from '@/services/api';
import { Button } from '@/components/ui/button';
import { OpenResearchReportDialog } from '@/components/OpenResearchReportDialog';
import { Clock, Calendar, FileText, User, BarChart2, Edit2 } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Input } from "@/components/ui/input";

interface CountryPageHeaderProps {
  countryData: CountryData;
  userProfile: UserProfile | null;
  metricsCount: number;
  isEditingInterest: boolean;
  newInterest: string;
  onEditInterest: () => void;
  onSaveInterest: () => void;
  onChangeInterest: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const CountryPageHeader: React.FC<CountryPageHeaderProps> = ({
  countryData,
  userProfile,
  metricsCount,
  isEditingInterest,
  newInterest,
  onEditInterest,
  onSaveInterest,
  onChangeInterest
}) => {
  const [isOpenResearchDialogOpen, setIsOpenResearchDialogOpen] = useState(false);
  const isSmallScreen = useMediaQuery('(max-width: 640px)');

  return (
    <div data-testid="country-page-header">
      <div className={`${isSmallScreen ? 'flex flex-col' : 'flex justify-between items-center'} mb-6`}>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">{countryData.country}</h2>
        <div data-testid="generate-open-research-report-button">
          <Button
            onClick={() => setIsOpenResearchDialogOpen(true)}
            className={isSmallScreen ? 'w-full' : ''}
          >
            Generate Open Research Report
          </Button>
        </div>
      </div>
      <div className={`grid ${isSmallScreen ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5'} gap-4`}>
        <InfoItem
          icon={<Calendar className="w-5 h-5 text-gray-500" />}
          label="Last updated"
          value={new Date(countryData.timestamp).toLocaleString() + " UTC"}
          tooltip="The most recent time the data was refreshed. To update the data, click the Fetch New Events button."
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
            testId="edit-area-of-interest-input"
            value={
              isEditingInterest ? (
                <div className="flex items-center space-x-2" >
                  <Input
                    value={newInterest}
                    onChange={onChangeInterest}
                    className="w-full"
                  />
                  <Button onClick={onSaveInterest} size="sm" variant="ghost">
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{userProfile.country_interests[countryData.country] || userProfile.area_of_interest}</span>
                  <Button
                    onClick={onEditInterest}
                    size="sm"
                    variant="ghost"
                    className="p-0 h-auto"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </Button>
                </div>
              )
            }
            tooltip="Your specified area of interest for this country. Click the edit icon to change."
          />
        )}

      </div>
      <OpenResearchReportDialog
        isOpen={isOpenResearchDialogOpen}
        onClose={() => setIsOpenResearchDialogOpen(false)}
        country={countryData.country}
      />
    </div >
  );
};

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tooltip: string;
  testId?: string;
}

const InfoItem: React.FC<InfoItemProps> = ({ icon, label, value, tooltip, testId }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-start space-x-3 p-3 bg-white rounded-md" data-testid={testId}>
          <div className="mt-1">{icon}</div>
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <div className="text-sm font-semibold text-gray-900">{value}</div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);