import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import CountryPage from '@/pages/CountryPage';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-3xl font-bold text-gray-900 hover:text-gray-700 transition-colors duration-200">
              Nuntium
            </Link>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/country/:country" element={<CountryPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;