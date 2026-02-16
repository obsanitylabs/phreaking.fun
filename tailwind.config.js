/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          green: {
            DEFAULT: "#22e584",
            light: "#38ef7d",
            bright: "#38ef7d",
            dark: "#175a38",
            hover: "#38ef7d22",
          },
          gray: {
            DEFAULT: "#35594B",
            dark: "#071e13",
            light: "#cbcbcb",
          },
          black: "#000000",
          white: "#ffffff",
          orange: "#FD9C26",
          red: "#9C001D",
        },
        // System colors
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        mono: ["var(--font-geist-mono)", "monospace"],
        sans: ["var(--font-geist-sans)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out",
        slideIn: "slideIn 0.3s ease-out",
        typing: "typing 0.12s steps(1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        typing: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      clipPath: {
        card: "polygon(15px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 15px)",
        button:
          "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
      },
    },
  },
  plugins: [animate],
};