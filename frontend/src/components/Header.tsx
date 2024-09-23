import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-8xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold text-gray-900 hover:text-gray-700 transition-colors duration-200 px-4">
          Nuntium
        </Link>
        <div>
          <Link to="/profile" className="mr-4">
            <Button variant="default">Profile</Button>
          </Link>
          <Button onClick={logout} variant="ghost">Logout</Button>
        </div>
      </div>
    </header>
  );
};

export default Header;