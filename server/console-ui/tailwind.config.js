/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#050811',
          900: '#080c14',
          850: '#0b1021',
          800: '#0f172a',
          700: '#1e293b',
          600: '#334155',
        }
      }
    },
  },
  plugins: [],
}
