// src/components/common/TabNavigation/TabNavigation.tsx
import React, { useRef, useEffect } from 'react';
import { TabNavigationProps } from './TabNavigation.types';

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default'
}) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active tab into view on mobile
  useEffect(() => {
    if (tabsContainerRef.current) {
      const activeElement = tabsContainerRef.current.querySelector('.nav-link-active');
      if (activeElement) {
        activeElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        });
      }
    }
  }, [activeTab]);

  const getTabClasses = (tab: Tab, isActive: boolean) => {
    const baseClasses = 'nav-link flex-shrink-0 px-4 py-3 text-sm font-medium transition-all duration-200';
    const activeClasses = 'nav-link-active';
    const disabledClasses = 'opacity-50 cursor-not-allowed';
    
    let classes = baseClasses;
    
    if (isActive) {
      classes += ` ${activeClasses}`;
    }
    
    if (tab.disabled) {
      classes += ` ${disabledClasses}`;
    }

    // Variant-specific classes
    switch (variant) {
      case 'pills':
        classes += isActive 
          ? ' bg-electric-yellow text-gray-900 rounded-full'
          : ' hover:bg-gray-100 rounded-full';
        break;
      case 'underline':
        classes += isActive 
          ? ' border-b-2 border-electric-yellow'
          : ' border-b-2 border-transparent hover:border-gray-300';
        break;
      default:
        // Default styling already applied via nav-link classes
        break;
    }

    return classes;
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav 
          ref={tabsContainerRef}
          className="flex overflow-x-auto scrollbar-hide space-x-1"
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                className={getTabClasses(tab, isActive)}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                disabled={tab.disabled}
              >
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="ml-2 badge-sm badge-secondary">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <div
              key={tab.id}
              id={`tabpanel-${tab.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${tab.id}`}
              className={`${isActive ? 'block' : 'hidden'} animate-fade-in`}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;
