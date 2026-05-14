/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#041424', // Deep Navy Background
          800: '#0b1b2b',
          700: '#112131',
        },
        slate: {
          800: '#1c2b3c',
          700: '#273647',
        },
        accent: {
          500: '#1B98E0', // Vibrant active connection
          400: '#8ecdff',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
