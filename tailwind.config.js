/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          yellow: '#FFD700',
          orange: '#FF8C00',
          red: '#FF1744',
          cyan: '#00FFFF',
          pink: '#FF006E',
          green: '#39FF14',
          purple: '#BF00FF',
        },
        dark: {
          900: '#080808',
          800: '#111111',
          700: '#1a1a1a',
          600: '#222222',
          500: '#2a2a2a',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
        display: ['Impact', 'Arial Black', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flicker': 'flicker 0.15s infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.7 },
        },
      },
      boxShadow: {
        'neon-yellow': '0 0 5px #FFD700, 0 0 20px #FFD700, 0 0 40px #FFD700',
        'neon-orange': '0 0 5px #FF8C00, 0 0 20px #FF8C00, 0 0 40px #FF8C00',
        'neon-red': '0 0 5px #FF1744, 0 0 20px #FF1744, 0 0 40px #FF1744',
        'neon-cyan': '0 0 5px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF',
        'neon-green': '0 0 5px #39FF14, 0 0 20px #39FF14, 0 0 40px #39FF14',
      },
    },
  },
  plugins: [],
};
