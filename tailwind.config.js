/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4A90E2', // lighter blue
          light: '#7CB3F5',
          dark: '#2E5C8A',
        },
        accent: {
          DEFAULT: '#F5A623', // warm orange
          light: '#FFB84D',
          dark: '#C27803',
        },
        neutral: {
          50: '#FAFBFC',
          100: '#F5F7FA',
          200: '#E4E7EB',
          300: '#CBD2D9',
          400: '#9AA5B1',
          500: '#7B8794',
          600: '#616E7C',
          700: '#52606D',
          800: '#3E4C59',
          900: '#323F4B',
        },
      },
    },
  },
  plugins: [],
}