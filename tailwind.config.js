/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Scans files in src folder
  ],
  theme: {
    extend: {
      // Add colors from brand guide
      colors: {
        "xlc-gold": "#FCC222",   // Brand-Gold (Accent)
        "xlc-slate": "#515459", // Brand-Slate (Neutral)
        // 'xlc-gold-darker': '#E5AD1E', // This is defined in the brand guide but we are using brightness for hover instead
      },
      // Add font families from brand guide
      fontFamily: {
        // Use 'sans' as the default body font to apply Inter broadly
        sans: ["Inter", "Helvetica Neue", "sans-serif"], // Use Inter as fallback for Telegraf
        heading: ["Archivo Black", "Impact", "sans-serif"], // For headings
      },
      // Add border radius from brand guide
      borderRadius: {
        'md': '8px', // Override default medium radius
      },
      // Removed the duplicate/redundant 'colors' key here
    },
  },
  plugins: [],
}
