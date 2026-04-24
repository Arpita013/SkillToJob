/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        neon: {
          purple: '#a855f7',
          blue: '#22d3ee',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(168,85,247,.18), 0 18px 60px rgba(34,211,238,.12)',
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(600px circle at 10% 10%, rgba(168,85,247,.18), transparent 55%), radial-gradient(600px circle at 90% 20%, rgba(34,211,238,.14), transparent 55%)',
      },
    },
  },
  plugins: [],
};

