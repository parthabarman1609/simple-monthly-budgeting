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

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'aa-blue': '#0078D2', // Official AA Flight Symbol Blue
        'aa-red': '#C30019',  // Official AA Flight Symbol Red
        'aa-navy': '#002147', // Keeping the dark text color
        'aa-gray-bg': '#F4F5F7',
        'aa-gray-border': '#E5E7EB',
      },
      fontFamily: {
        // This makes Plus Jakarta Sans the default for the entire app
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        
        // This keeps Ubuntu as a special class (font-ubuntu) just for your logo
        ubuntu: ['Ubuntu', 'sans-serif'], 
      }
    },
  },
  plugins: [],
}