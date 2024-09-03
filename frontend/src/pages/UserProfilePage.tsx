import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';

interface UserProfile {
  first_name: string;
  last_name: string;
  area_of_interest: string;
}

const UserProfilePage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { logout } = useAuth();
  
    useEffect(() => {
      fetchProfile();
    }, []);
  
    const fetchProfile = async () => {
      try {
        const data = await api.getUserProfile();
        setProfile(data);
        setOriginalProfile(data);
      } catch (err) {
        setError('Failed to fetch user profile');
      }
    };
  
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (profile) {
        setProfile({ ...profile, [e.target.name]: e.target.value });
      }
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (profile && originalProfile) {
        const changes = Object.entries(profile).reduce((acc, [key, value]) => {
          if (value !== originalProfile[key as keyof UserProfile]) {
            acc[key] = `${originalProfile[key as keyof UserProfile]} -> ${value}`;
          }
          return acc;
        }, {} as Record<string, string>);
  
        if (Object.keys(changes).length === 0) {
          alert('No changes were made to the profile.');
          return;
        }
  
        const changesMessage = Object.entries(changes)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
  
        if (window.confirm(`The following changes will be made:\n\n${changesMessage}\n\nDo you want to save these changes?`)) {
          try {
            await api.updateUserProfile(profile);
            setOriginalProfile(profile);
            alert('Profile updated successfully!');
          } catch (err) {
          setError('Failed to update profile');
        }
      }
    }
  };

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <Input
                id="first_name"
                type="text"
                name="first_name"
                value={profile.first_name}
                onChange={handleInputChange}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <Input
                id="last_name"
                type="text"
                name="last_name"
                value={profile.last_name}
                onChange={handleInputChange}
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <label htmlFor="area_of_interest" className="block text-sm font-medium text-gray-700 mb-1">
                Area of Interest
              </label>
              <Input
                id="area_of_interest"
                type="text"
                name="area_of_interest"
                value={profile.area_of_interest}
                onChange={handleInputChange}
                placeholder="Enter your area of interest"
              />
            </div>
            <Button type="submit">Save Changes</Button>
            <Button variant="outline" onClick={logout}>Logout</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserProfilePage;