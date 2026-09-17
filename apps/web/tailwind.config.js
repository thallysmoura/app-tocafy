/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#121212',
        elevated: '#1A1A1E',
        elevatedhover: '#26262C',
        accent: '#1DB954',
        accenthover: '#22D667',
        muted: '#A3A3AE',
      },
      fontFamily: {
        sans: ['var(--font-roboto)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
