import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CountryData, UserProfile } from '@/services/api';

interface CountryPageHeaderProps {
  countryData: CountryData;
  userProfile: UserProfile | null;
}

export const CountryPageHeader: React.FC<CountryPageHeaderProps> = ({ countryData, userProfile }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold">Events in {countryData.country}</h2>
      <br/>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <p>Last updated: <strong>{new Date(countryData.timestamp).toLocaleString()}</strong></p>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>The most recent time the data was refreshed</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <p>Hours of data: <strong>{countryData.hours}</strong></p>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>The time range of collected data in hours</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <p>Events Found: <strong>{countryData.no_relevant_events}</strong></p>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>The number of relevant events detected in this time period</p>
          </TooltipContent>
        </Tooltip>
        {userProfile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <p>Your Area of Interest: <strong>{userProfile.area_of_interest}</strong></p>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Your specified area of interest to be used for generating reports. To change, update your profile.</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
};