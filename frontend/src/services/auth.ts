import { api } from '@/services/api';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
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
      throw new Error('Registration failed');
    }
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
};