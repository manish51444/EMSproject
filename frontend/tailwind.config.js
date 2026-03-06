/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand: green #1cca9b, header #0e2b3d, subheader #666
        primary: {
          50: '#e6faf5',
          100: '#b3f0e0',
          200: '#80e6cb',
          300: '#4ddbb6',
          400: '#1cca9b',
          500: '#18b58a',
          600: '#14a07a',
          700: '#108b6a',
          800: '#0c765a',
          900: '#08614a',
        },
        header: '#0e2b3d',
        subheader: '#666666',
      },
    },
  },
  plugins: [],
}

