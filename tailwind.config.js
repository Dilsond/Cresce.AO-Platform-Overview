/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Força a inclusão da animação
  safelist: [
    'animate-spin',
    'animate-pulse',
  ]
}