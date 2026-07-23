/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        github: {
          DEFAULT: '#2da44e',
          dark: '#238636',
          bg: 'rgba(35, 134, 54, 0.15)',
        },
        google: {
          DEFAULT: '#4285f4',
          dark: '#1a73e8',
          bg: 'rgba(66, 133, 244, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
