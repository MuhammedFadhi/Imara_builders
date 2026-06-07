/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        imara: {
          blue: '#162029',
          blueDark: '#0d1319',
          blueLight: '#f0f4f8',
          red: '#ff451a',
          redDark: '#e03a14',
          redLight: '#fff0ec',
          bg: '#f3f4f6',
          card: '#ffffff',
          text: '#111827',
          textMuted: '#6b7280'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
