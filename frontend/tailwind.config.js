/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        ink: "#1d1d1f",
        mute: "#6e6e73",
        paper: "#fbfbfd",
        fog: "#f5f5f7",
        line: "#d2d2d7",
        // Coolors-style food palette
        sun: "#f4e285",
        carbs: "#f4a259",
        protein: "#5b8e7d",
        fat: "#bc4b51",
        fiber: "#8cb369",
      },
      letterSpacing: { tighter2: "-0.035em" },
    },
  },
  plugins: [],
};
