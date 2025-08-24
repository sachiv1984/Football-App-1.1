import React from 'react';

// Custom hook for accessing design system tokens
export function useDesignSystem() {
  return {
    colors: {
      primary: {
        yellow: '#FFFF00',
        blue: '#003366',
      },
      semantic: {
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',
      },
    },
  };
}

// Helper hook for responsive design
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = React.useState<string>('sm');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width >= 1536) setBreakpoint('2xl');
      else if (width >= 1280) setBreakpoint('xl');
      else if (width >= 1024) setBreakpoint('lg');
      else if (width >= 768) setBreakpoint('md');
      else setBreakpoint('sm');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}
