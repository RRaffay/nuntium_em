import { auth } from '@/services/auth';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

export interface ArticleInfo {
  summary: string;
  url: string;
}

export interface Event {
  id: string;
  title: string;  
  event_summary: string;
  relevance_score: number;
  articles: ArticleInfo[];
}

export interface CountryData {
  country: string;
  events: Event[];
  timestamp: string;
  hours: number;
  no_relevant_events: number;
}

export interface Report {
  content: string;
  generated_at: string;
}

export interface CountryInfo {
  name: string;
  timestamp: string;
  hours: number;
  no_relevant_events: number;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  area_of_interest: string;
  email: string;
  is_verified: boolean;
}

export interface ChatMessage {
  content: string;
  sender: 'user' | 'model';
}

export interface IndicatorDataPoint {
  date: string;
  value: number | null;
}

export interface CountryMetrics {
  [key: string]: IndicatorDataPoint[];
}

const getAuthHeaders = (): HeadersInit => {
  const token = auth.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    // Token might be expired, try to refresh
    try {
      await auth.refreshToken();
      // Retry the original request
      const newResponse = await fetch(response.url, {
        ...response,
        headers: {
          ...response.headers,
          Authorization: `Bearer ${auth.getToken()}`,
        },
      });
      return newResponse;
    } catch (error) {
      // If refresh fails, log out the user
      auth.logout();
      throw new Error('Session expired. Please log in again.');
    }
  } else if (response.status === 429) {
    // Rate limit exceeded
    const retryAfter = response.headers.get('Retry-After');
    throw new Error(`Rate limit exceeded. Please try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`);
  }
  return response;
};

export const api = {
  API_BASE_URL,

  async getAddableCountries(): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/addable-countries`, {
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
  },

  async getCountries(): Promise<CountryInfo[]> {
    const response = await fetch(`${API_BASE_URL}/countries`, {
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
  },

  async getCountryData(country: string): Promise<CountryData> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}`, {
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
  },

  async generateCountryReport(country: string): Promise<Report> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/generate-report`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
  },

  async generateEventReport(country: string, eventId: string): Promise<Report> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/events/${eventId}/generate-report`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
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
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
  },

  async deleteCountry(country: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch countries');
    }
    return handledResponse.json();
  },

  async getUserProfile(): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to fetch user profile');
    }
    return handledResponse.json();
  },
  
  async updateUserProfile(profile: UserProfile): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profile),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to update user profile');
    }
  },

  async sendChatMessage(message: string, encodedReport: string, messages: ChatMessage[], proMode: boolean): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/research-chat`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message, 
        encodedReport, 
        messages: messages.map(m => [m.content, m.sender] as [string, string]),
        proMode
      }),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to send chat message');
    }
    return handledResponse.json();
  },

  async requestVerifyToken(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/request-verify-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to request verification token');
    }
  },

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      const errorData = await handledResponse.json();
      throw new Error(errorData.detail || 'Failed to verify email');
    }
  },

  async requestPasswordReset(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      throw new Error('Failed to request password reset');
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, password: newPassword }),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      const errorData = await handledResponse.json();
      throw new Error(errorData.detail || 'Failed to reset password');
    }
  },

  async getCountryMetrics(country: string): Promise<CountryMetrics> {
    const response = await fetch(`${API_BASE_URL}/countries/${country}/metrics`, {
      headers: getAuthHeaders(),
    });
    const handledResponse = await handleResponse(response);
    if (!handledResponse.ok) {
      console.error('Failed to fetch country metrics');
      throw new Error('Failed to fetch country metrics');
    }
    const data = await handledResponse.json();
    console.log('Retrieved country metrics:', Object.keys(data));
    return data;
  },

};