/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "neo-bg": "#FFFAE5",
        "neo-main": "#FF4500",
        "neo-accent": "#FDE047",
        "neo-black": "#111111",
      },
      fontFamily: {
        display: ['"Syne"', "sans-serif"],
        body: ['"Space Grotesk"', "sans-serif"],
        heavy: ['"Archivo Black"', "sans-serif"],
      },
      boxShadow: {
        neo: "8px 8px 0px 0px #111111",
        "neo-sm": "4px 4px 0px 0px #111111",
      },
    },
  },
  plugins: [],
};










