import { useEffect } from 'react';
import { useTour } from '@/contexts/TourContext';
import { Step } from 'react-joyride';

export const useTourSteps = (component: 'Dashboard' | 'CountryPage') => {
  const { setSteps } = useTour();

  useEffect(() => {
    let newSteps: Step[] = [];

    if (component === 'Dashboard') {
      newSteps = [
        {
          target: 'body',
          content: 'Welcome to Nuntium! Let\'s take a quick tour of the dashboard.',
          placement: 'center',
        },
        {
          target: '[data-testid="add-country-button"]',
          content: 'Click here to add a new country to your dashboard.',
        },
        {
          target: '[data-testid="country-card"]',
          content: 'These cards show information about each country you\'re tracking.',
        },
      ];
    } else if (component === 'CountryPage') {
      newSteps = [
        {
            target: '[data-testid="country-page-header"]',
            content: 'This header shows key information about the selected country.',
          },
          {
            target: '[data-testid="generate-open-research-report-button"]',
            content: 'Click here to generate a custom research report.',
          },
          {
            target: '[data-testid="edit-area-of-interest-input"]',
            content: 'Click here to edit your area of interest.',
          },
          {
            target: '[data-testid="toggle-view-mode"]',
            content: 'Switch between Events, Indicators, or Both views here.',
          },
          {
            target: '[data-testid="events-section"]',
            content: 'Here you can view and analyze events related to the country.',
          },
          {
            target: '[data-testid="event-accordion-item"] button',
            content: 'Click here to expand an event and see more details.',
          },
          {
            target: '[data-testid="event-accordion-item"] [data-testid="article-dialog-button"]',
            content: 'This button opens a dialog with the full article text.',
          },
          {
            target: '[data-testid="event-accordion-item"] [data-testid="report-dialog-button"]',
            content: 'Click here to generate or view a report for this event.',
          },
          {
            target: '[data-testid="fetch-new-events-button"]',
            content: 'Click here to fetch new events for this country.',
          },
          {
            target: '[data-testid="toggle-view-mode"]',
            content: 'Switch to the Indicators view.',
          },
          {
            target: '[data-testid="economic-indicators-chart"]',
            content: 'This view shows economic indicators for the country.',
          },
          {
            target: '[data-testid="display-mode-switch"]',
            content: 'Toggle between single and multiple chart views.',
          },
          {
            target: '[data-testid="metric-selector"]',
            content: 'Select different metrics to display on the chart.',
          },
          {
            target: '[data-testid="chat-button"]',
            content: 'Click here to open the chat interface.',
          },
          {
            target: '[data-testid="pro-mode-switch"]',
            content: 'Toggle Pro Mode for more detailed responses.',
          },
          {
            target: '[data-testid="chat-input"]',
            content: 'Type your questions about the data here.',
          },
          {
            target: '[data-testid="send-button"]',
            content: 'Click to send your question and get an AI-generated response.',
          },
          {
            target: '[data-testid="clear-chat-button"]',
            content: 'Clear the chat history when you\'re done.',
          },
          {
            target: 'body',
            content: 'Hope you enjoyed the tour! For more information, reach out to us at foundingteam@nuntiumai.com',
            placement: 'center',
          },
      ];
    }

    setSteps(newSteps);
  }, [component, setSteps]);
};
