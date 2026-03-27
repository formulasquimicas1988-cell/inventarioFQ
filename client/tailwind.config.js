/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:      { DEFAULT: '#CC0000', dark: '#AA0000', light: '#E53535' },
        sidebar:      { DEFAULT: '#0A1F44', light: '#132d5e', hover: '#1a3a6e' },
        'deep-blue':  '#0A1F44',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        base: ['17px', '1.6'],
        sm:   ['15px', '1.5'],
        xs:   ['13px', '1.4'],
        lg:   ['19px', '1.5'],
        xl:   ['22px', '1.4'],
        '2xl':['26px', '1.3'],
        '3xl':['32px', '1.2'],
      },
      minHeight: {
        touch: '48px',
      },
      minWidth: {
        touch: '48px',
      },
    },
  },
  plugins: [],
};
