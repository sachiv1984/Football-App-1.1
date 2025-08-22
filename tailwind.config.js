/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
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
      }
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
}