import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTour } from '@/contexts/TourContext';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const { startTour, currentTourType, setAutoStartTour } = useTour();
  const location = useLocation();

  const handleStartTour = () => {
    let component: 'All' | 'Dashboard' | 'CountryPage';

    if (location.pathname === '/') {
      component = 'Dashboard';
    } else if (location.pathname.startsWith('/country/')) {
      component = 'CountryPage';
    } else {
      component = 'All';
    }

    setAutoStartTour(true);
    startTour(component);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="bg-white shadow">
      <div className="max-w-8xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <Link to="/" className="text-3xl font-bold text-gray-900 hover:text-gray-700 transition-colors duration-200 px-4">
          Nuntium
        </Link>
        <div className="flex items-center">
          <Button onClick={handleStartTour} variant="ghost" className="mr-4" data-testid="start-tour-button">
            <HelpCircle className="mr-2 h-4 w-4" />
            Start {currentTourType === 'CountryPage' ? 'Country' : 'Dashboard'} Tour
          </Button>
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