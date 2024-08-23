const API_BASE_URL = 'http://localhost:8000';

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
}

export interface Report {
  country: string;
  content: string;
  generated_at: string;
}

export const api = {
  async getCountries(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/countries`);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    return response.json();
  },

  async getCountryEvents(country: string): Promise<Event[]> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/events`);
    if (!response.ok) {
      throw new Error(`Failed to fetch events for ${country}`);
    }
    return response.json();
  },

  async generateReport(country: string): Promise<Report> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/generate-report`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to generate report for ${country}`);
    }
    return response.json();
  },
};