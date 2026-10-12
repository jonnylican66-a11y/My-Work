/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        void: "#070908",
        ember: "#ff9b32",
        phosphor: "#a4f5c2"
      },
      fontFamily: {
        mono: ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "sans-serif"]
      }
    }
  },
  plugins: []
};
