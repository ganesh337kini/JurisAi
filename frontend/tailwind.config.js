/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Instrument Serif", "Georgia", "serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(16, 185, 129, 0.25), 0 20px 60px rgba(2, 6, 23, 0.65)",
      },
    },
  },
  plugins: [],
};
