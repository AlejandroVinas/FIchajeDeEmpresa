/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:    { DEFAULT: '#0F1B2D', mid: '#1E3A5F' },
        accent:  { DEFAULT: '#D4440F' },
        brand:   { DEFAULT: '#3730a3', hover: '#4338ca' },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
