import { api } from '@/services/api';
import fetchMock from 'jest-fetch-mock';
import { auth } from '@/services/auth';

// Mock the auth service
jest.mock('@/services/auth', () => ({
  auth: {
    getToken: jest.fn(() => 'mock-token'),
  },
}));

fetchMock.enableMocks();

describe('API Service', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
     // Reset the mock implementation of getToken before each test
     (auth.getToken as jest.Mock).mockImplementation(() => 'mock-token');
  });

  it('getAddableCountries fetches correctly', async () => {
    fetchMock.mockResponseOnce(JSON.stringify(['USA', 'Canada']));

    const countries = await api.getAddableCountries();

    expect(countries).toEqual(['USA', 'Canada']);
    expect(fetchMock).toHaveBeenCalledWith(
      `${api.API_BASE_URL}/addable-countries`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('getCountries fetches correctly', async () => {
    const mockCountries = [
      { name: 'USA', timestamp: '2023-06-01', hours: 24, no_relevant_events: 10 },
    ];
    fetchMock.mockResponseOnce(JSON.stringify(mockCountries));

    const countries = await api.getCountries();

    expect(countries).toEqual(mockCountries);
    expect(fetchMock).toHaveBeenCalledWith(
      `${api.API_BASE_URL}/countries`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('getCountryData fetches correctly', async () => {
    const mockCountryData = {
      country: 'USA',
      events: [],
      timestamp: '2023-06-01',
      hours: 24,
      no_relevant_events: 0,
    };
    fetchMock.mockResponseOnce(JSON.stringify(mockCountryData));

    const countryData = await api.getCountryData('USA');

    expect(countryData).toEqual(mockCountryData);

    expect(fetchMock).toHaveBeenCalledWith(
      `${api.API_BASE_URL}/countries/USA`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('generateCountryReport generates correctly', async () => {
    const mockReport = { content: 'Report content', generated_at: '2023-06-01T00:00:00Z' };
    fetchMock.mockResponseOnce(JSON.stringify(mockReport));

    const report = await api.generateCountryReport('USA');

    expect(report).toEqual(mockReport);
    expect(fetchMock).toHaveBeenCalledWith(
      `${api.API_BASE_URL}/countries/USA/generate-report`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('sendChatMessage sends correctly', async () => {
    const mockResponse = 'AI response';
    fetchMock.mockResponseOnce(JSON.stringify(mockResponse));

    const response = await api.sendChatMessage('Hello', 'encodedReport', [], false);

    expect(response).toEqual(mockResponse);
    expect(fetchMock).toHaveBeenCalledWith(
      `${api.API_BASE_URL}/research-chat`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: expect.any(String),
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          message: 'Hello',
          encodedReport: 'encodedReport',
          messages: [],
          proMode: false,
        }),
      })
    );
  });

  it('handles rate limit errors', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ detail: 'Rate limit exceeded' }), { status: 429 });

    await expect(api.getAddableCountries()).rejects.toThrow('Rate limit exceeded');
  });


  it('throws an error when token refresh fails', async () => {
    // Mock the initial 401 response
    fetchMock.mockResponseOnce('', { status: 401 });
    
    // Mock the token refresh to fail
    (auth.refreshToken as jest.Mock) = jest.fn().mockRejectedValue(new Error('Refresh failed'));

    // Mock the auth.logout method
    (auth.logout as jest.Mock) = jest.fn();

    // Attempt to call an API method that should trigger the refresh
    await expect(api.getAddableCountries()).rejects.toThrow('Session expired. Please log in again.');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

});
