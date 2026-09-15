/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EEF1EA",      // pale catalog-card background
        card: "#FFFDF8",
        ink: "#1F2A44",        // deep navy ink
        inkfaint: "#5B6478",
        mustard: "#D9A441",    // "lost" tag color
        mustardDark: "#B5822E",
        teal: "#2F6F62",       // "found / resolved" stamp color
        tealDark: "#204E44",
        stamp: "#B8443B",      // urgent / claim accent
        line: "#D8DACD",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Source Sans 3'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(31,42,68,0.06), 0 1px 3px rgba(31,42,68,0.08)",
      },
    },
  },
  plugins: [],
};
