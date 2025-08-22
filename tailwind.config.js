/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}'], // Adjust the glob pattern for your project structure
  theme: {
    extend: {}, // Extend the default TailwindCSS theme here
  },
  plugins: [
    require('@tailwindcss/forms'), // Add plugins if you're using them
    require('@tailwindcss/typography'),
  ],
};
