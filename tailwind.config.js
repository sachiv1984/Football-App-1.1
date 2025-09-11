/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // ===== COLORS (mapped to CSS vars) =====
      colors: {
        premier: {
          50: "var(--color-premier-purple-50)",
          100: "var(--color-premier-purple-100)",
          200: "var(--color-premier-purple-200)",
          300: "var(--color-premier-purple-300)",
          400: "var(--color-premier-purple-400)",
          500: "var(--color-premier-purple-500)",
          600: "var(--color-premier-purple-600)",
          700: "var(--color-premier-purple-700)",
          800: "var(--color-premier-purple-800)",
          900: "var(--color-premier-purple-900)",
          DEFAULT: "var(--color-premier-purple-500)",
        },
        electric: {
          50: "var(--color-electric-blue-50)",
          100: "var(--color-electric-blue-100)",
          200: "var(--color-electric-blue-200)",
          300: "var(--color-electric-blue-300)",
          400: "var(--color-electric-blue-400)",
          500: "var(--color-electric-blue-500)",
          600: "var(--color-electric-blue-600)",
          700: "var(--color-electric-blue-700)",
          800: "var(--color-electric-blue-800)",
          900: "var(--color-electric-blue-900)",
          DEFAULT: "var(--color-electric-blue)",
          yellow: "var(--color-electric-yellow)",
        },
        pitch: {
          50: "var(--color-pitch-green-50)",
          100: "var(--color-pitch-green-100)",
          200: "var(--color-pitch-green-200)",
          300: "var(--color-pitch-green-300)",
          400: "var(--color-pitch-green-400)",
          500: "var(--color-pitch-green-500)",
          600: "var(--color-pitch-green-600)",
          700: "var(--color-pitch-green-700)",
          800: "var(--color-pitch-green-800)",
          900: "var(--color-pitch-green-900)",
          DEFAULT: "var(--color-pitch-green)",
        },
        gold: "var(--color-focus-gold)",
        crimson: "var(--color-crimson-red)",
        sunset: "var(--color-sunset-orange)",
        status: {
          live: "var(--color-status-live)",
          upcoming: "var(--color-status-upcoming)",
          finished: "var(--color-status-finished)",
          featured: "var(--color-status-featured)",
        },
      },

      // ===== TYPOGRAPHY =====
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },

      // ===== SHADOWS =====
      boxShadow: {
        card: "var(--shadow-card)",
        "card-hover": "var(--shadow-card-hover)",
        "card-active": "var(--shadow-card-active)",
        "card-focus": "var(--shadow-card-focus)",
        premium: "var(--shadow-premium)",
        glow: "var(--shadow-glow)",
        "gold-glow": "var(--shadow-gold-glow)",
      },

      // ===== TRANSITIONS =====
      transitionDuration: {
        250: "250ms",
        300: "300ms",
        350: "350ms",
        400: "400ms",
      },
      transitionTimingFunction: {
        smooth: "var(--easing-smooth)",
        premium: "var(--easing-premium)",
      },

      // ===== ANIMATIONS =====
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "subtle-pulse": {
          "0%, 100%": { opacity: "1", transform: "rotate(-1deg) scale(1)" },
          "50%": { opacity: "0.9", transform: "rotate(-1deg) scale(1.02)" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "live-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-in-out",
        slideUp: "slideUp 0.3s ease-out",
        "subtle-pulse": "subtle-pulse 2s ease-in-out infinite",
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
        "live-dot": "live-dot 1s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },

      // ===== GRADIENTS =====
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, var(--color-premier-purple-500), var(--color-electric-blue))",
        shimmer:
          "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    // Custom utilities
    function ({ addUtilities }) {
      addUtilities({
        ".text-gradient-primary": {
          background:
            "linear-gradient(135deg, var(--color-premier-purple-500), var(--color-electric-blue))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".text-gradient-accent": {
          background:
            "linear-gradient(135deg, var(--color-pitch-green), var(--color-focus-gold))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".bg-glass": {
          "backdrop-filter": "blur(10px)",
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        },
      });
    },
  ],
  safelist: [
    "scale-102",
    "scale-104",
    "scale-108",
    "shadow-card",
    "shadow-card-hover",
    "shadow-card-active",
    "animate-subtle-pulse",
    "animate-live-pulse",
    "text-gradient-primary",
    "text-gradient-accent",
  ],
};
