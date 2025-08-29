// /src/components/common/Header
import React, { useState } from 'react';
import { Menu, X, Search, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  currentPath?: string;
  onNavigate?: (path: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

interface NavigationItem {
  label: string;
  path: string;
}

const Header: React.FC<HeaderProps> = ({ 
  currentPath = '/', 
  onNavigate = (path) => console.log(`Navigate to ${path}`),
  isDarkMode = false,
  onToggleDarkMode = () => console.log('Toggle dark mode')
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const navigationItems: NavigationItem[] = [
    { label: 'Fixtures', path: '/fixtures' },
    { label: 'Teams', path: '/teams' },
    { label: 'Player Stats', path: '/stats' },
    { label: 'AI Insights', path: '/insights' }
  ];

  const toggleMenu = (): void => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleNavigation = (path: string): void => {
    onNavigate(path);
    setIsMenuOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Search for:', searchQuery);
      // Handle search logic here
    }
  };

  const toggleSearch = (): void => {
    setIsSearchExpanded(!isSearchExpanded);
    if (isSearchExpanded) {
      setSearchQuery('');
    }
  };

  const isActive = (path: string): boolean => currentPath === path;

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-lg border-b-2 border-yellow-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <button 
              onClick={() => handleNavigation('/')}
              className="flex items-center hover:opacity-80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-md p-1"
              aria-label="Home"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-green-400 rounded-lg flex items-center justify-center font-bold text-slate-900 text-xl shadow-md">
                FS
              </div>
              <div className="ml-3 text-xl font-bold text-white">
                Football<span className="bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">Stats</span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation - Center */}
          <nav className="hidden lg:block flex-1" role="navigation" aria-label="Main navigation">
            <div className="flex justify-center">
              <div className="flex items-center space-x-1 bg-slate-800/50 rounded-full px-2 py-1 border border-slate-700">
                {navigationItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                      isActive(item.path)
                        ? 'bg-yellow-400 text-slate-900 shadow-md'
                        : 'text-gray-200 hover:text-yellow-400 hover:bg-slate-700'
                    }`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Right Section - Search & Dark Mode */}
          <div className="flex items-center space-x-3">
            
            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <div className={`flex items-center transition-all duration-300 ${
                  isSearchExpanded ? 'w-64' : 'w-10'
                }`}>
                  <input
                    type="text"
                    placeholder="Search teams, players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                    className={`${
                      isSearchExpanded 
                        ? 'w-full pl-4 pr-10 opacity-100' 
                        : 'w-0 pl-0 pr-0 opacity-0'
                    } py-2 bg-slate-800 border border-slate-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300`}
                  />
                  <button
                    onClick={isSearchExpanded ? (e) => handleSearchSubmit(e) : toggleSearch}
                    className={`${
                      isSearchExpanded ? 'absolute right-2' : 'relative'
                    } p-2 text-gray-200 hover:text-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded-full transition-colors duration-200`}
                    aria-label={isSearchExpanded ? 'Search' : 'Open search'}
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                {isSearchExpanded && (
                  <button
                    onClick={toggleSearch}
                    className="absolute -right-8 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-200 transition-colors duration-200"
                    aria-label="Close search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={onToggleDarkMode}
              className="p-2 text-gray-200 hover:text-yellow-400 hover:bg-slate-800 rounded-full focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all duration-200"
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-200 hover:text-yellow-400 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors duration-200"
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
          <div className="lg:hidden animate-slide-up" id="mobile-menu">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-slate-800/95 backdrop-blur-sm rounded-lg mt-2 border border-slate-700">
              
              {/* Mobile Search */}
              <div className="md:hidden mb-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search teams, players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                    className="w-full pl-4 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                  />
                  <button
                    onClick={(e) => handleSearchSubmit(e)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-yellow-400 transition-colors duration-200"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Links */}
              {navigationItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                    isActive(item.path)
                      ? 'bg-yellow-400 text-slate-900'
                      : 'text-gray-200 hover:text-yellow-400 hover:bg-slate-700'
                  }`}
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
