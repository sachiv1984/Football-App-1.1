/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",  // include all JS/TS/TSX files
    "./src/**/*.{css}"              // include any CSS files
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
    },
  },
  plugins: [
    require('@tailwindcss/forms'), 
    require('@tailwindcss/typography')
  ],
}
