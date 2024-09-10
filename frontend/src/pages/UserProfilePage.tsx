import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/services/api';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, XCircle } from 'lucide-react'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"

interface UserProfile {
  first_name: string;
  last_name: string;
  area_of_interest: string;
  email: string;
  is_verified: boolean;
}

const UserProfilePage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRequestingVerification, setIsRequestingVerification] = useState(false);
    const { logout, checkVerificationStatus } = useAuth();
  
    useEffect(() => {
      const fetchProfile = async () => {
        try {
          const userProfile = await api.getUserProfile();
          setProfile(userProfile);
          setOriginalProfile(userProfile);
        } catch (err) {
          setError('Failed to fetch user profile');
        }
      };

      fetchProfile();
    }, []);
  
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

    const handleRequestVerification = async () => {
      if (profile) {
        setIsRequestingVerification(true);
        try {
          await api.requestVerifyToken(profile.email);
          alert('Verification email sent. Please check your inbox.');
        } catch (err) {
          setError('Failed to request verification email');
        } finally {
          setIsRequestingVerification(false);
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
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                name="email"
                value={profile.email}
                readOnly
                className="bg-gray-100"
              />
            </div>
            <Alert variant={profile.is_verified ? "default" : "destructive"}>
              <AlertTitle>
                {profile.is_verified ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <br />
                {profile.is_verified ? "Email Verified" : "Email Not Verified"}
              </AlertTitle>
              <AlertDescription>
                {profile.is_verified
                  ? ""
                  : "Please verify your email to access all features."}
              </AlertDescription>
            </Alert>
            {!profile.is_verified && (
              <Button
                type="button"
                onClick={handleRequestVerification}
                disabled={isRequestingVerification}
                className="w-full"
              >
                {isRequestingVerification ? "Sending..." : "Request Verification Email"}
              </Button>
            )}
            <div className="space-y-2 mt-4">
              <Button type="submit" className="w-full">Save Changes</Button>
              <Button variant="outline" onClick={logout} className="w-full">Logout</Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default UserProfilePage;