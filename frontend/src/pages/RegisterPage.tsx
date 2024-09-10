import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '../services/api';

const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [areaOfInterest, setAreaOfInterest] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [isRegistered, setIsRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(firstName, lastName, email, password, areaOfInterest);
      await api.requestVerifyToken(email);
      setIsRegistered(true);
    } catch (err) {
      setError('Registration failed. Please try again.');
    }
  };

  if (isRegistered) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Registration Successful</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your account has been created successfully.</p>
          <p>To access all features, please verify your email address. We've sent a verification link to your email.</p>
          <div className="mt-4">
            <Link to="/login" className="text-blue-500 hover:underline">
              Proceed to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Register</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="text"
              placeholder="Area of Interest"
              value={areaOfInterest}
              onChange={(e) => setAreaOfInterest(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="text-red-500">{error}</p>}
            <Button type="submit" className="w-full">Register</Button>
            <div className="text-center">
              <Link to="/login" className="text-blue-500 hover:underline">
                Already have an account? Login here
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterPage;