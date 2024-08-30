import { auth } from '@/services/auth';

const API_BASE_URL = 'http://localhost:8000';

export interface ArticleInfo {
  summary: string;
  url: string;
}

export interface Event {
  id: string;
  title: string;  
  event_summary: string;
  articles: ArticleInfo[];
}

export interface CountryData {
  country: string;
  events: Event[];
}

export interface Report {
  content: string;
  generated_at: string;
}

export interface CountryInfo {
  name: string;
  timestamp: string;
  hours: number;
  no_matched_clusters: number;
}

const getAuthHeaders = (): HeadersInit => {
  const token = auth.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  API_BASE_URL,

  async getAddableCountries(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/addable-countries`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch addable countries');
    }
    return response.json();
  },

  async getCountries(): Promise<CountryInfo[]> {
    const response = await fetch(`${API_BASE_URL}/countries`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    return response.json();
  },

  async getCountryData(country: string): Promise<CountryData> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch data for ${country}`);
    }
    return response.json();
  },

  async generateCountryReport(country: string): Promise<Report> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/generate-report`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to generate report for ${country}`);
    }
    return response.json();
  },

  async generateEventReport(country: string, eventId: string): Promise<Report> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/events/${eventId}/generate-report`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to generate report for event ${eventId} in ${country}`);
    }
    return response.json();
  },

  async runCountryPipeline(country: string, hours: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/run-country-pipeline`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ country, hours }),
    });
    if (!response.ok) {
      throw new Error(`Failed to run pipeline for ${country}`);
    }
  },
};