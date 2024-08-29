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
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold text-gray-900 hover:text-gray-700 transition-colors duration-200">
          Nuntium
        </Link>
        <Button onClick={logout} variant="outline">Logout</Button>
      </div>
    </header>
  );
};

export default Header;