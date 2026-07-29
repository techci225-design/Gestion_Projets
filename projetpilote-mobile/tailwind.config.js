/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./screens/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A5F",
        success: "#16A34A",
        warning: "#F59E0B",
        danger: "#DC2626",
      }
    },
  },
  plugins: [],
}
