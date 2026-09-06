/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Design tokens for the ADAS cockpit theme - see README/design notes.
        void: "#0A0D12",       // page background
        panel: "#12161D",      // card / panel background
        panelborder: "#232935",
        steel: {
          100: "#C7CEDA",
          300: "#8A93A3",
          500: "#5C6577",
        },
        safe: "#00D97E",
        caution: "#FFB020",
        danger: "#FF3B3B",
        info: "#3DDAFF",
      },
      fontFamily: {
        hud: ["'Rajdhani'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        glow_safe: "0 0 18px rgba(0, 217, 126, 0.35)",
        glow_caution: "0 0 18px rgba(255, 176, 32, 0.35)",
        glow_danger: "0 0 24px rgba(255, 59, 59, 0.45)",
        glow_info: "0 0 14px rgba(61, 218, 255, 0.25)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(0%)" },
          "100%": { transform: "translateY(2000%)" },
        },
        pulse_danger: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.55 },
        },
      },
      animation: {
        scan: "scan 6s linear infinite",
        pulse_danger: "pulse_danger 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
