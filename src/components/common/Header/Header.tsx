import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  currentPath?: string;
}

const Navigation: React.FC<NavigationProps> = ({ currentPath = '/' }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    { label: 'Fixtures', path: '/fixtures' },
    { label: 'Table', path: '/table' },
    { label: 'Stats', path: '/stats' },
    { label: 'Insights', path: '/insights' },
    { label: 'Responsible Betting', path: '/responsible-betting' }
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isActive = (path: string) => currentPath === path;

  return (
    <header className="sticky top-0 z-50 bg-blue-900 shadow-lg border-b-2 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-green-400 rounded-lg flex items-center justify-center font-bold text-blue-900 text-xl">
                FS
              </div>
              <span className="ml-3 text-xl font-bold text-white">
                Football<span className="text-yellow-400">Stats</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-1">
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-blue-800 hover:text-yellow-400 ${
                    isActive(item.path)
                      ? 'bg-yellow-400 text-blue-900 shadow-md'
                      : 'text-gray-200 hover:shadow-md'
                  }`}
                  onClick={() => console.log(`Navigate to ${item.path}`)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-yellow-400 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors duration-200"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-800 rounded-lg mt-2 border-t-2 border-yellow-400">
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                    isActive(item.path)
                      ? 'bg-yellow-400 text-blue-900'
                      : 'text-gray-200 hover:text-yellow-400 hover:bg-blue-700'
                  }`}
                  onClick={() => {
                    console.log(`Navigate to ${item.path}`);
                    setIsMenuOpen(false);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Demo wrapper to show the navigation in context
const NavigationDemo: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('/fixtures');

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation currentPath={currentPath} />
      
      {/* Demo content to show sticky behavior */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Navigation Header Demo</h1>
          <p className="text-gray-600 mb-4">
            This header demonstrates the sticky navigation with your brand colors:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-2">
            <li><strong>Background:</strong> Deep Blue (#003366 / Navy)</li>
            <li><strong>Active state:</strong> Electric Yellow accent</li>
            <li><strong>Hover effects:</strong> Smooth transitions with yellow highlights</li>
            <li><strong>Mobile responsive:</strong> Hamburger menu for small screens</li>
            <li><strong>Logo:</strong> Gradient placeholder with your brand initials</li>
          </ul>
        </div>

        {/* Spacer content to demonstrate sticky behavior */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Section {i + 1}
            </h2>
            <p className="text-gray-600">
              This is demo content to show how the sticky navigation works. 
              Scroll up and down to see the header remain at the top of the page.
              The navigation includes hover effects and active states as specified 
              in your brand guidelines.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NavigationDemo;
