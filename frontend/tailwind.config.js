/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#baddff',
          300: '#7dc3ff',
          400: '#38a3f8',
          500: '#0e86e8',
          600: '#0268c6',
          700: '#0353a1',
          800: '#074785',
          900: '#0c3d6e',
          950: '#082648',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
