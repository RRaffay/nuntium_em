const API_BASE_URL = 'http://localhost:8000';

export interface ArticleInfo {
  summary: string;
  url: string;
}

export interface Event {
  id: string;
  cluster_summary: string;
  articles: ArticleInfo[];
}

export interface CountryData {
  country: string;
  events: Event[];
}

export const api = {
  async getCountries(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/countries`);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    return response.json();
  },

  async getCountryData(country: string): Promise<CountryData> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for ${country}`);
    }
    return response.json();
  },
};