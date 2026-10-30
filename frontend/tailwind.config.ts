import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f2',
          100: '#d5ecdf',
          500: '#1f7a4d',
          600: '#17653f',
          700: '#114f31',
        },
        cream: '#f6f1ea',
        espresso: '#3b2a20',
      },
    },
  },
  plugins: [],
};

export default config;
