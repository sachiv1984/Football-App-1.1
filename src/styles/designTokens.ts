// src/styles/designTokens.ts

export const designTokens = {
  colors: {
    background: '#FFFFFF',
    text: '#374151', // default dark gray body text

    // Primary Brand Colors (Premium Football Experience)
    primary: {
      // Legacy support
      electricYellow: '#FFFF00',
      focusGold: '#FFD700',
      
      // New Premier League inspired palette
      premierPurple: '#3D195B',      // Deep, authoritative purple
      royalPurple: '#4C1D6B',       // Slightly lighter variant
      50: '#F8F4FF',
      100: '#EDE4FF',
      200: '#DCC7FF',
      300: '#C8A4FF',
      400: '#A855F7',
      500: '#3D195B',               // Main brand color
      600: '#2D1343',
      700: '#1E0D2D',
      800: '#150820',
      900: '#0A0410',
    },

    // Secondary Accent Colors (Energy & Football)
    secondary: {
      // Football pitch inspired greens
      pitchGreen: '#00A86B',        // Vibrant football pitch green
      emeraldGreen: '#059669',      // Rich emerald variant
      
      // Electric blues for digital energy
      electricBlue: '#007FFF',      // Modern, electric blue
      skyBlue: '#0EA5E9',          // Lighter sky variant
      
      // Legacy support
      deepBlue: '#003366',
      navy: '#000080',
      
      50: '#EFF9FF',
      100: '#DEF3FF',
      200: '#B6E7FF',
      300: '#75D4FF',
      400: '#007FFF',               // Main secondary color
      500: '#0066CC',
      600: '#004499',
      700: '#003366',
      800: '#002244',
      900: '#001122',
    },

    // Tertiary Support Colors
    tertiary: {
      warmGold: '#FFB800',          // Warmer gold for highlights
      sunsetOrange: '#FF6B35',      // Energy and excitement
      crimsonRed: '#DC2626',        // Match importance indicators
    },

    // Enhanced Neutral Base
    neutral: {
      background: '#FFFFFF',
      white: '#FFFFFF',
      
      // Sophisticated gray scale
      50: '#FAFAFA',               // Lightest background
      100: '#F5F5F5',              // Light background
      200: '#E5E5E5',              // Border light
      300: '#D4D4D4',              // Border medium
      400: '#A3A3A3',              // Text light
      500: '#6B7280',              // Text medium (carousel text)
      600: '#525252',              // Text dark
      700: '#374151',              // Body text
      800: '#262626',              // Headings
      900: '#171717',              // Darkest text
      
      // Legacy aliases
      lightGrey: '#F5F5F5',
      mediumGrey: '#6B7280',
      darkGrey: '#374151',
      charcoal: '#2C2C2C',         // Deep charcoal for premium feel
      black: '#000000',
    },

    // Status & Feedback Colors
    status: {
      success: '#22C55E',           // Green success
      successLight: '#BBF7D0',
      warning: '#F59E0B',           // Amber warning
      warningLight: '#FEF3C7',
      error: '#EF4444',             // Red error
      errorLight: '#FECACA',
      info: '#3B82F6',              // Blue info
      infoLight: '#DBEAFE',
      
      // Football-specific statuses
      live: '#22C55E',              // Live match green
      upcoming: '#F59E0B',          // Upcoming amber
      finished: '#6B7280',          // Finished gray
      featured: '#FFD700',          // Featured gold
    },

    // Interactive States
    interactive: {
      hover: '#F3F4F6',             // Light hover
      hoverDark: '#E5E7EB',         // Medium hover
      focus: '#FFD700',             // Focus gold
      active: '#3D195B',            // Active purple
      disabled: '#D1D5DB',          // Disabled gray
      
      // Carousel-specific
      carouselFocus: '#007FFF',     // Electric blue for carousel focus
      carouselActive: '#3D195B',    // Purple for active slides
      carouselHover: '#00A86B',     // Green accent on hover
    }
  },

  typography: {
    fontFamily: {
      heading: ['Poppins', 'system-ui', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      display: ['Poppins', 'system-ui', 'sans-serif'], // For large headings
    },
    fontSize: {
      '2xs': '0.625rem',    // 10px - for micro text
      xs: '0.75rem',        // 12px
      sm: '0.875rem',       // 14px
      base: '1rem',         // 16px
      lg: '1.125rem',       // 18px
      xl: '1.25rem',        // 20px
      '2xl': '1.5rem',      // 24px
      '3xl': '1.875rem',    // 30px
      '4xl': '2.25rem',     // 36px
      '5xl': '3rem',        // 48px
      '6xl': '3.75rem',     // 60px
      '7xl': '4.5rem',      // 72px
    },
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
    lineHeight: {
      none: '1',
      tight: '1.25',
      snug: '1.375',
      normal: '1.5',
      relaxed: '1.625',
      loose: '2',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    }
  },

  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem',        // 2px
    1: '0.25rem',           // 4px
    1.5: '0.375rem',        // 6px
    2: '0.5rem',            // 8px
    2.5: '0.625rem',        // 10px
    3: '0.75rem',           // 12px
    3.5: '0.875rem',        // 14px
    4: '1rem',              // 16px
    5: '1.25rem',           // 20px
    6: '1.5rem',            // 24px
    7: '1.75rem',           // 28px
    8: '2rem',              // 32px
    9: '2.25rem',           // 36px
    10: '2.5rem',           // 40px
    11: '2.75rem',          // 44px
    12: '3rem',             // 48px
    14: '3.5rem',           // 56px
    16: '4rem',             // 64px
    20: '5rem',             // 80px
    24: '6rem',             // 96px
    
    // Semantic spacing
    xs: '0.25rem',          // 4px
    sm: '0.5rem',           // 8px
    md: '1rem',             // 16px
    lg: '1.5rem',           // 24px
    xl: '2rem',             // 32px
    '2xl': '2.5rem',        // 40px
    '3xl': '3rem',          // 48px
    '4xl': '4rem',          // 64px
    '5xl': '5rem',          // 80px
  },

  borderRadius: {
    none: '0',
    sm: '0.125rem',         // 2px
    DEFAULT: '0.25rem',     // 4px
    md: '0.375rem',         // 6px
    lg: '0.5rem',           // 8px
    xl: '0.75rem',          // 12px
    '2xl': '1rem',          // 16px
    '3xl': '1.5rem',        // 24px
    full: '9999px',
  },

  shadows: {
    // Standard shadows
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',

    // Carousel-specific shadows with purple tints
    card: '0 4px 12px rgba(61, 25, 91, 0.1)',           // Subtle purple tint
    cardHover: '0 6px 18px rgba(61, 25, 91, 0.15)',     // Enhanced purple hover
    cardActive: '0 8px 24px rgba(61, 25, 91, 0.2)',     // Strong purple active
    cardFocus: '0 0 0 3px rgba(255, 215, 0, 0.3)',      // Gold focus ring
    
    // Premium shadows
    premium: '0 12px 32px rgba(0, 0, 0, 0.15)',
    glow: '0 0 20px rgba(0, 127, 255, 0.3)',            // Electric blue glow
    goldGlow: '0 0 20px rgba(255, 215, 0, 0.4)',        // Gold glow for featured
  },

  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px', 
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },

  // Animation & Motion
  animation: {
    duration: {
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '750ms',
    },
    easing: {
      linear: 'linear',
      ease: 'ease',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
      
      // Custom premium easings
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      premium: 'cubic-bezier(0.23, 1, 0.32, 1)',
    }
  },

  // Layout & Sizing
  layout: {
    // Carousel-specific sizing
    carousel: {
      cardMinHeight: '280px',
      cardMaxWidth: '320px',
      navigationSize: '44px',
      dotSize: '12px',
      dotActiveSize: '32px',
      
      // Gaps
      gapMobile: '16px',
      gapTablet: '24px',
      gapDesktop: '32px',
    }
  }
} as const;

// Enhanced type definitions
export type ColorPalette = typeof designTokens.colors;
export type Typography = typeof designTokens.typography;
export type Spacing = typeof designTokens.spacing;
export type Shadows = typeof designTokens.shadows;
export type Animation = typeof designTokens.animation;

// Utility type for accessing nested color values
export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
};

// Helper functions for better DX
export const getColorValue = (path: string): string => {
  const keys = path.split('.');
  let value: any = designTokens.colors;
  
  for (const key of keys) {
    value = value[key];
  }
  
  return value || '#000000';
};

// Pre-built color combinations for quick access
export const colorCombinations = {
  primary: {
    bg: designTokens.colors.primary[500],
    text: designTokens.colors.neutral.white,
    hover: designTokens.colors.primary[600],
  },
  secondary: {
    bg: designTokens.colors.secondary[400],
    text: designTokens.colors.neutral.white,
    hover: designTokens.colors.secondary[500],
  },
  carousel: {
    focus: designTokens.colors.interactive.carouselFocus,
    active: designTokens.colors.interactive.carouselActive,
    hover: designTokens.colors.interactive.carouselHover,
  }
};
