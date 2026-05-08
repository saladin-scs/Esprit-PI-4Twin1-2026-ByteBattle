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
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Soft pastel system – light mode
        surface: {
          DEFAULT: '#fafbff',
          muted: '#f1f5f9',
          elevated: '#ffffff',
        },
        // Dark mode overrides via dark: (using same names with different values in classes)
        pastel: {
          lavender: '#e8e4f3',
          mint: '#e0f2f0',
          peach: '#fce8e6',
          sky: '#dbeafe',
          ink: '#334155',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'header': '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'dropdown': '0 10px 40px -10px rgb(0 0 0 / 0.15), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
      },
    },
  },
  plugins: [],
}

