/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          750: '#243247',
          850: '#151f32',
        },
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
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        unifont: ['"Unifont"', '"GNU Unifont"', 'monospace'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        system: ['system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
