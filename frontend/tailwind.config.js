/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'], // The Meta-style body font
        logo: ['"Poppins"', 'sans-serif'],           // The new youthful logo font
      },
      colors: {
        'aa-blue': '#00467F',
        'aa-red': '#C30019',
        'aa-gray-bg': '#F4F5F7',
        'aa-gray-border': '#E5E7EB',
      }
    },
  },
  plugins: [],
}