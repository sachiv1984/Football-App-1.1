/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      // ===== COLORS (using CSS variables) =====
      colors: {
        // Primary brand colors
        primary: {
          50: "rgb(248 244 255)", // #F8F4FF
          100: "rgb(237 228 255)", // #EDE4FF
          200: "rgb(220 199 255)", // #DCC7FF
          300: "rgb(200 164 255)", // #C8A4FF
          400: "rgb(168 85 247)", // #A855F7
          500: "rgb(61 25 91)", // #3D195B - main brand color
          600: "rgb(45 19 67)", // #2D1343
          700: "rgb(30 13 45)", // #1E0D2D
          800: "rgb(21 8 32)", // #150820
          900: "rgb(10 4 16)", // #0A0410
          DEFAULT: "rgb(61 25 91)", // #3D195B
        },
        secondary: {
          50: "rgb(239 249 255)", // #EFF9FF
          100: "rgb(222 243 255)", // #DEF3FF
          200: "rgb(182 231 255)", // #B6E7FF
          300: "rgb(117 212 255)", // #75D4FF
          400: "rgb(0 127 255)", // #007FFF - main secondary color
          500: "rgb(0 102 204)", // #0066CC
          600: "rgb(0 68 153)", // #004499
          700: "rgb(0 51 102)", // #003366
          800: "rgb(0 34 68)", // #002244
          900: "rgb(0 17 34)", // #001122
          DEFAULT: "rgb(0 127 255)", // #007FFF
        },
        // Semantic colors
        electric: {
          blue: "rgb(0 127 255)", // #007FFF
          yellow: "rgb(255 255 0)", // #FFFF00
          DEFAULT: "rgb(0 127 255)",
        },
        pitch: {
          green: "rgb(0 168 107)", // #00A86B
          DEFAULT: "rgb(0 168 107)",
        },
        gold: "rgb(255 215 0)", // #FFD700
        'focus-gold': "rgb(255 215 0)", // #FFD700
        'warm-gold': "rgb(255 184 0)", // #FFB800
        crimson: "rgb(220 38 38)", // #DC2626
        sunset: "rgb(255 107 53)", // #FF6B35
        
        // Status colors
        status: {
          live: "rgb(34 197 94)", // #22C55E
          upcoming: "rgb(245 158 11)", // #F59E0B
          finished: "rgb(107 114 128)", // #6B7280
          featured: "rgb(255 215 0)", // #FFD700
        },

        // Enhanced neutral scale
        neutral: {
          50: "rgb(250 250 250)", // #FAFAFA
          100: "rgb(245 245 245)", // #F5F5F5
          200: "rgb(229 229 229)", // #E5E5E5
          300: "rgb(212 212 212)", // #D4D4D4
          400: "rgb(163 163 163)", // #A3A3A3
          500: "rgb(107 114 128)", // #6B7280
          600: "rgb(82 82 82)", // #525252
          700: "rgb(55 65 81)", // #374151
          800: "rgb(38 38 38)", // #262626
          900: "rgb(23 23 23)", // #171717
        },
        
        // Interactive states
        hover: "rgb(243 244 246)", // #F3F4F6
        'hover-dark': "rgb(229 231 235)", // #E5E7EB
        focus: "rgb(255 215 0)", // #FFD700
        active: "rgb(61 25 91)", // #3D195B
        disabled: "rgb(209 213 219)", // #D1D5DB
      },

      // ===== TYPOGRAPHY =====
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'], // Override default
      },

      // ===== SHADOWS =====
      boxShadow: {
        card: "0 4px 12px rgba(61, 25, 91, 0.1)",
        "card-hover": "0 6px 18px rgba(61, 25, 91, 0.15)",
        "card-active": "0 8px 24px rgba(61, 25, 91, 0.2)",
        "card-focus": "0 0 0 3px rgba(255, 215, 0, 0.3)",
        premium: "0 12px 32px rgba(0, 0, 0, 0.15)",
        glow: "0 0 20px rgba(0, 127, 255, 0.3)",
        "gold-glow": "0 0 20px rgba(255, 215, 0, 0.4)",
      },

      // ===== SPACING =====
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '112': '28rem',   // 448px
      },

      // ===== TRANSITIONS =====
      transitionDuration: {
        250: "250ms",
        300: "300ms",
        350: "350ms",
        400: "400ms",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        premium: "cubic-bezier(0.23, 1, 0.32, 1)",
        bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
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
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-in-out",
        slideUp: "slideUp 0.3s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "subtle-pulse": "subtle-pulse 2s ease-in-out infinite",
        "live-pulse": "live-pulse 1.5s ease-in-out infinite",
        "live-dot": "live-dot 1s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },

      // ===== GRADIENTS =====
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, rgb(61 25 91), rgb(0 127 255))",
        "gradient-secondary": "linear-gradient(135deg, rgb(0 127 255), rgb(14 165 233))",
        "gradient-accent": "linear-gradient(135deg, rgb(0 168 107), rgb(255 215 0))",
        shimmer: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent)",
      },

      // ===== BORDER RADIUS =====
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    // Custom utilities plugin
    function ({ addUtilities, addComponents, theme }) {
      // Add custom utilities
      addUtilities({
        // Text gradients
        ".text-gradient-primary": {
          background: "linear-gradient(135deg, rgb(61 25 91), rgb(0 127 255))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        ".text-gradient-accent": {
          background: "linear-gradient(135deg, rgb(0 168 107), rgb(255 215 0))",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
          "background-clip": "text",
        },
        // Glass morphism
        ".bg-glass": {
          "backdrop-filter": "blur(10px)",
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
        },
        ".bg-glass-dark": {
          "backdrop-filter": "blur(10px)",
          background: "rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
        // Custom transforms
        ".scale-102": { transform: "scale(1.02)" },
        ".scale-104": { transform: "scale(1.04)" },
        ".scale-108": { transform: "scale(1.08)" },
        // Container utilities
        ".container-narrow": {
          "max-width": "768px",
          "margin-left": "auto",
          "margin-right": "auto",
          "padding-left": "1rem",
          "padding-right": "1rem",
        },
        ".container-wide": {
          "max-width": "1400px",
          "margin-left": "auto",
          "margin-right": "auto",
          "padding-left": "1rem",
          "padding-right": "1rem",
        },
      });

      // Add custom components
      addComponents({
        // Unified card base
        ".card-base": {
          "@apply bg-white rounded-xl border border-neutral-200 cursor-pointer select-none": {},
          "box-shadow": theme("boxShadow.card"),
          "transition": "all 300ms cubic-bezier(0.23, 1, 0.32, 1)",
          "position": "relative",
          "overflow": "hidden",
        },
        // Button variants
        ".btn-base": {
          "@apply inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300": {},
          "@apply focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed": {},
          "font-family": theme("fontFamily.heading"),
        },
        ".btn-primary": {
          "@apply btn-base bg-gradient-to-br from-primary-500 to-primary-600 text-white": {},
          "@apply hover:shadow-lg hover:scale-105 focus:ring-primary-500": {},
        },
        ".btn-secondary": {
          "@apply btn-base bg-gradient-to-br from-secondary-400 to-secondary-500 text-white": {},
          "@apply hover:shadow-lg hover:scale-105 focus:ring-secondary-400": {},
        },
      });
    },
  ],
  safelist: [
    // Ensure these classes are never purged
    "scale-102",
    "scale-104", 
    "scale-108",
    "shadow-card",
    "shadow-card-hover",
    "shadow-card-active",
    "shadow-card-focus",
    "animate-subtle-pulse",
    "animate-live-pulse",
    "animate-live-dot",
    "text-gradient-primary",
    "text-gradient-accent",
    "carousel-card",
    "fixture-card",
    "team-logo",
    "status-live",
    "status-upcoming",
    "status-finished",
    "carousel-ribbon",
    "carousel-dot",
    "carousel-pagination",
    // Swiper classes
    "swiper-pagination-bullet",
    "swiper-pagination-bullet-active",
    "swiper-button-next",
    "swiper-button-prev",
  ],
};
