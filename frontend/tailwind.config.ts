import type { Config } from 'tailwindcss';

/**
 * Bảng màu BrewLite – lấy cảm hứng từ quán cà phê Việt:
 * giấy gói (paper), cà phê rang đậm (ink), gạch bông xanh ngọc (jade), sữa đặc (milk).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#EEF0EA',
        ink: {
          DEFAULT: '#231710',
          soft: '#5B4D44',
          mute: '#8A7F77',
        },
        line: '#D5D9CF',
        jade: {
          50: '#E7F1EE',
          100: '#CBE4DD',
          200: '#9FCBBF',
          500: '#0F6B5B',
          600: '#0B5A4C',
          700: '#08473C',
          900: '#052D26',
        },
        milk: {
          100: '#FBEFD2',
          400: '#EDB443',
          600: '#B9821B',
        },
        brick: {
          50: '#FBEDE9',
          600: '#B5432E',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        ticket: '22px',
      },
      keyframes: {
        'ticket-in': {
          '0%': { transform: 'translateY(16px) rotate(-1.5deg)', opacity: '0' },
          '100%': { transform: 'translateY(0) rotate(0)', opacity: '1' },
        },
        'toast-in': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'ticket-in': 'ticket-in 420ms cubic-bezier(.2,.8,.2,1) both',
        'toast-in': 'toast-in 180ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
