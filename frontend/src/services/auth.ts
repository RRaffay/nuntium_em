import { api } from '@/services/api';

export interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  is_verified: boolean;
  area_of_interest: string;
}

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  area_of_interest: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
}

const AUTH_TOKEN_KEY = 'auth_token';

export const auth = {
    async login(credentials: LoginCredentials): Promise<void> {
        const formData = new URLSearchParams();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
      
        const response = await fetch(`${api.API_BASE_URL}/auth/jwt/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        });
      
        if (!response.ok) {
          throw new Error('Login failed');
        }
      
        const data: AuthResponse = await response.json();
        localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    },

    async register(credentials: RegisterCredentials): Promise<void> {
      const response = await fetch(`${api.API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      // Request verification token after successful registration
      await api.requestVerifyToken(credentials.email);
    },

    async getDashboardHeader(): Promise<string> {
      const token = this.getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }
  
      const response = await fetch(`${api.API_BASE_URL}/dashboard-header`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard header');
      }
  
      const data = await response.json();
      return data.message;
    },

    async refreshToken(): Promise<void> {
      const response = await fetch(`${api.API_BASE_URL}/auth/jwt/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getToken()}`,
        },
      });
    
      if (!response.ok) {
        throw new Error('Token refresh failed');
      }
    
      const data: AuthResponse = await response.json();
      localStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    },

    async verifyEmail(token: string): Promise<void> {
      await api.verifyEmail(token);
    },

    async getUserProfile(): Promise<UserProfile> {
      const response = await fetch(`${api.API_BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      return response.json();
    },

    logout(): void {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    },

    getToken(): string | null {
      return localStorage.getItem(AUTH_TOKEN_KEY);
    },

    isAuthenticated(): boolean {
      return !!this.getToken();
    },

    async requestPasswordReset(email: string): Promise<void> {
      await api.requestPasswordReset(email);
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
      await api.resetPassword(token, newPassword);
    },
};