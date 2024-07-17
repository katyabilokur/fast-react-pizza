/** @type {import('tailwindcss').Config} */
//eslint-disable-next-line
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', './src/ui/*.jsx'],
  theme: {
    fontFamily: { sans: 'Roboto Mono, monospace' },

    extend: { colors: { pizza: '#263891' }, height: { screen: '100dvh' } },
  },
  plugins: [],
};
