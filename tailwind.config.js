/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Tells Tailwind to scan JS/JSX files in src
  ],
  theme: {
    extend: {
      colors: {
        'brand-text':    '#1A1A1A',
        'brand-bg':      '#FFFFFF',
        'brand-bg-alt':  '#F8F8F8',
        'brand-accent':  '#4C4C4C',
      },
    },
  },
  plugins: [],
}

