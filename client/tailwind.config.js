/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#CC0000',
        'brand-blue': '#0A1F44',
      },
      fontSize: {
        'base': ['17px', { lineHeight: '1.6' }],
      },
      minHeight: {
        'touch': '48px',
        'row': '56px',
      },
      minWidth: {
        'touch': '48px',
      },
      width: {
        'sidebar': '260px',
        'sidebar-collapsed': '72px',
      }
    },
  },
  plugins: [],
}
