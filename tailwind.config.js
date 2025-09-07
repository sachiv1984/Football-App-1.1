/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",  // include all JS/TS/TSX files
    "./src/**/*.css"                // include any CSS files
  ],
  theme: {
    extend: {
      colors: {
        'electric-yellow': '#FFFF00',
        'neon-green': '#39FF14',
        'deep-blue': '#003366',
        'navy': '#000080',
        'light-grey': '#F5F5F5',
        'highlight-red': '#EF4444',
        'highlight-teal': '#14B8A6',
        'focus-gold': '#FFD700',     // for focus rings
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'heading': ['Poppins', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
      },
      boxShadow: {
        'card': '0 4px 12px rgba(0,0,0,0.1)',
        'card-hover': '0 6px 18px rgba(0,0,0,0.15)',
        'card-active': '0 10px 20px rgba(0,0,0,0.15)',
      },
      scale: {
        '102': '1.02',
        '108': '1.08',
      },
      blur: {
        'xs': '0.5px',
      },
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
      transitionDuration: {
        '300': '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), 
    require('@tailwindcss/typography')
  ],
}