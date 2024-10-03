import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginPage from '../pages/LoginPage';

// Mock the useNavigate hook
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => jest.fn(),
}));

// Mock the useAuth hook
jest.mock('../contexts/AuthContext', () => ({
    ...jest.requireActual('../contexts/AuthContext'),
    useAuth: jest.fn(),
}));

describe('LoginPage', () => {
    beforeEach(() => {
        (useAuth as jest.Mock).mockReturnValue({
            login: jest.fn(),
            isAuthenticated: false,
        });
    });

    it('renders login form', () => {
        const { getByPlaceholderText, getByRole } = render(
            <Router>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </Router>
        );

        expect(getByPlaceholderText('Username')).toBeInTheDocument();
        expect(getByPlaceholderText('Password')).toBeInTheDocument();
        expect(getByRole('button', { name: 'Login' })).toBeInTheDocument();
    });

    it('handles form submission', async () => {
        const mockLogin = jest.fn();
        (useAuth as jest.Mock).mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
        });

        const { getByPlaceholderText, getByRole } = render(
            <Router>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </Router>
        );

        fireEvent.change(getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(getByPlaceholderText('Password'), { target: { value: 'password123' } });
        fireEvent.click(getByRole('button', { name: 'Login' }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
        });
    });

    it('displays error message on login failure', async () => {
        const mockLogin = jest.fn().mockRejectedValue(new Error('Login failed'));
        (useAuth as jest.Mock).mockReturnValue({
            login: mockLogin,
            isAuthenticated: false,
        });

        const { getByPlaceholderText, getByRole, findByText } = render(
            <Router>
                <AuthProvider>
                    <LoginPage />
                </AuthProvider>
            </Router>
        );

        fireEvent.change(getByPlaceholderText('Username'), { target: { value: 'testuser' } });
        fireEvent.change(getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });
        fireEvent.click(getByRole('button', { name: 'Login' }));

        const errorMessage = await findByText('Login failed. Please check your credentials.');
        expect(errorMessage).toBeInTheDocument();
    });
});
