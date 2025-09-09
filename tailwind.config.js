/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // ===== COLORS =====
      colors: {
        // Primary Brand Colors
        'premier-purple': {
          50: '#F8F4FF',
          100: '#EDE4FF',
          200: '#DCC7FF',
          300: '#C8A4FF',
          400: '#A855F7',
          500: '#3D195B', // Main brand color
          600: '#2D1343',
          700: '#1E0D2D',
          800: '#150820',
          900: '#0A0410',
          DEFAULT: '#3D195B',
        },
        'royal-purple': '#4C1D6B',
        
        // Secondary Colors
        'electric-blue': {
          50: '#EFF9FF',
          100: '#DEF3FF',
          200: '#B6E7FF',
          300: '#75D4FF',
          400: '#007FFF', // Main secondary color
          500: '#0066CC',
          600: '#004499',
          700: '#003366',
          800: '#002244',
          900: '#001122',
          DEFAULT: '#007FFF',
        },
        'pitch-green': {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#00A86B', // Main green
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          DEFAULT: '#00A86B',
        },
        'sky-blue': '#0EA5E9',
        
        // Tertiary Support
        'warm-gold': '#FFB800',
        'sunset-orange': '#FF6B35',
        'crimson-red': '#DC2626',
        
        // Focus & Interactive
        'focus-gold': '#FFD700',
        
        // Status Colors
        'status-live': '#22C55E',
        'status-upcoming': '#F59E0B',
        'status-finished': '#6B7280',
        'status-featured': '#FFD700',
      },

      // ===== TYPOGRAPHY =====
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'heading': ['Poppins', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'body': ['Inter', 'system-ui', 'sans-serif'], // alias for consistency
      },

      // ===== SPACING & LAYOUT =====
      gap: {
        'carousel-mobile': '16px',
        'carousel-tablet': '24px', 
        'carousel-desktop': '32px',
      },
      
      width: {
        'dot-active': '24px',
        'dot-inactive': '8px',
      },
      
      height: {
        'dot': '8px',
      },

      minHeight: {
        'carousel-card': '280px',
      },

      // ===== ENHANCED SHADOWS =====
      boxShadow: {
        'card': '0 4px 12px rgba(61, 25, 91, 0.1)', // Enhanced with purple tint
        'card-hover': '0 6px 18px rgba(61, 25, 91, 0.15)',
        'card-active': '0 8px 24px rgba(61, 25, 91, 0.2)', // Enhanced
        'card-focus': '0 0 0 3px rgba(255, 215, 0, 0.3)',
        'premium': '0 12px 32px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(0, 127, 255, 0.3)',
        'gold-glow': '0 0 20px rgba(255, 215, 0, 0.4)',
      },

      // ===== TRANSFORMS =====
      scale: {
        '102': '1.02',
        '104': '1.04',
        '108': '1.08',
      },

      blur: {
        'xs': '0.5px',
      },

      // ===== FOCUS STATES =====
      ringColor: {
        'focus-gold': '#FFD700',
        'premier-purple': '#3D195B',
        'electric-blue': '#007FFF',
      },

      // ===== ANIMATIONS =====
      keyframes: {
        // Keep existing animations
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // Add premium animations
        'subtle-pulse': {
          '0%, 100%': { 
            opacity: '1', 
            transform: 'rotate(-1deg) scale(1)' 
          },
          '50%': { 
            opacity: '0.9', 
            transform: 'rotate(-1deg) scale(1.02)' 
          },
        },
        'live-pulse': {
          '0%, 100%': { 
            opacity: '1', 
            transform: 'scale(1)' 
          },
          '50%': { 
            opacity: '0.8', 
            transform: 'scale(1.05)' 
          },
        },
        'live-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },

      animation: {
        // Keep existing
        fadeIn: 'fadeIn 0.5s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
        // Add new premium animations
        'subtle-pulse': 'subtle-pulse 2s ease-in-out infinite',
        'live-pulse': 'live-pulse 1.5s ease-in-out infinite',
        'live-dot': 'live-dot 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },

      // ===== TRANSITIONS =====
      transitionDuration: {
        '250': '250ms',
        '300': '300ms',
        '350': '350ms',
        '400': '400ms',
      },

      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'premium': 'cubic-bezier(0.23, 1, 0.32, 1)',
      },

      // ===== GRADIENTS =====
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), 
    require('@tailwindcss/typography'),
    // Custom plugin for additional utilities
    function({ addUtilities, theme }) {
      addUtilities({
        '.text-gradient-primary': {
          background: `linear-gradient(135deg, ${theme('colors.premier-purple.500')}, ${theme('colors.electric-blue.400')})`,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.text-gradient-accent': {
          background: `linear-gradient(135deg, ${theme('colors.pitch-green.500')}, ${theme('colors.focus-gold')})`,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        '.bg-glass': {
          'backdrop-filter': 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
        },
      });
    },
  ],
  // Safelist important dynamic classes
  safelist: [
    'scale-102',
    'scale-104',
    'scale-108',
    'shadow-card',
    'shadow-card-hover',
    'shadow-card-active',
    'animate-subtle-pulse',
    'animate-live-pulse',
    'text-gradient-primary',
    'text-gradient-accent',
  ],
};