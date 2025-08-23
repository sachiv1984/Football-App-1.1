// src/hooks/useDesignSystem.ts - Hook for accessing design system values
import { designTokens } from '../styles/designTokens';

export function useDesignSystem() {
  return {
    colors: designTokens.colors,
    typography: designTokens.typography,
    spacing: designTokens.spacing,
    borderRadius: designTokens.borderRadius,
    shadows: designTokens.shadows,
    breakpoints: designTokens.breakpoints,
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
