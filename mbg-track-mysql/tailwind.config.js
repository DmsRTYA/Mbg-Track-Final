/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#5DADE2',
          600: '#2e86c1',
          700: '#1d6fa4',
          800: '#1e5f8a',
          900: '#1e4d70',
        },
        mbg: {
          blue: '#5DADE2',
          'blue-light': '#87CEEB',
          'blue-dark': '#2e86c1',
          'blue-pale': '#EBF5FB',
          green: '#27AE60',
          'green-light': '#E9F7EF',
          amber: '#F39C12',
          'amber-light': '#FEF9E7',
          red: '#E74C3C',
          'red-light': '#FDEDEC',
          slate: '#F8FAFC',
          'gray-soft': '#F1F5F9',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0,0,0,0.07), 0 10px 20px -2px rgba(0,0,0,0.04)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'elevated': '0 10px 40px -10px rgba(93,173,226,0.25)',
      }
    },
  },
  plugins: [],
}
