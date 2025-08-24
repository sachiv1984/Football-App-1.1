import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import './Header.module.css';

interface HeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
}

interface NavigationItem {
  label: string;
  path: string;
  isResponsibleBetting?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  currentPath = '/', 
  onNavigate = (path) => console.log(`Navigate to ${path}`) 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems: NavigationItem[] = [
    { label: 'Fixtures', path: '/fixtures' },
    { label: 'Table', path: '/table' },
    { label: 'Stats', path: '/stats' },
    { label: 'Insights', path: '/insights' },
    { label: 'Responsible Betting', path: '/responsible-betting', isResponsibleBetting: true }
  ];

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (path: string): void => {
    onNavigate(path);
    setIsMenuOpen(false);
  };

  const isActive = (path: string): boolean => currentPath === path;

  return (
    <header className="sticky top-0 z-50 bg-gradient-secondary shadow-lg border-b-2 border-yellow-400">
      <div className="container">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => handleNavigation('/')}
              className="flex items-center hover-lift focus:outline-none focus:ring-2 focus:ring-electric-yellow rounded-md"
              aria-label="Home"
            >
              <div className="team-logo w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center font-bold text-gray-900 text-xl">
                FS
              </div>
              <div className="ml-3 text-xl font-bold text-white">
                Football<span className="text-gradient">Stats</span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:block" role="navigation" aria-label="Main navigation">
            <div className="ml-10 flex items-baseline space-x-1">
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`btn btn-sm transition-all duration-200 ${
                    isActive(item.path)
                      ? 'btn-primary shadow-md'
                      : 'nav-link text-gray-200 hover:text-yellow-400 hover:bg-blue-800'
                  } ${item.isResponsibleBetting ? 'border border-yellow-400/30' : ''}`}
                  aria-current={isActive(item.path) ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-yellow-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors duration-200"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle navigation menu"
            >
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
          <div className="md:hidden" id="mobile-menu">
            <div className="card-hover px-2 pt-2 pb-3 space-y-1 bg-slate-800 rounded-lg mt-2 border-t-2 border-yellow-400">
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                    isActive(item.path)
                      ? 'btn-primary text-slate-900'
                      : 'text-gray-200 hover:text-yellow-400 hover:bg-slate-700'
                  } ${item.isResponsibleBetting ? 'border border-yellow-400/30 mt-2' : ''}`}
                  aria-current={isActive(item.path) ? 'page' : undefined}
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

export default Header;
