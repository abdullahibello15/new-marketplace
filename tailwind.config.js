export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        cream: '#FAF6EE',
        sand: '#F1ECDF',
        line: '#E7DECB',
        ink: '#1C1B18',
        muted: '#6B665B',
        pine: { DEFAULT: '#1F4B4D', deep: '#163A3C' },
        clay: { DEFAULT: '#CF5A2E', dark: '#A8441D', soft: '#FBEDE6' },
        mustard: { DEFAULT: '#D9A933', dark: '#8A6410' },
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
};
