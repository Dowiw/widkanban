/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        '2xl': 'var(--modal-radius, 1rem)',
        'xl': 'var(--card-radius, 0.75rem)',
        'lg': 'var(--subcard-radius, 0.5rem)',
        'md': 'var(--input-radius, 0.375rem)',
        DEFAULT: 'var(--input-radius, 0.25rem)',
        'sm': 'var(--input-radius, 0.125rem)',
      },
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
