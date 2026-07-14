import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0d0d14",
        card: "#13131f",
      },
      animation: {
        'pulse-red': 'pulse-glow-red 2s ease-in-out infinite',
        'spin-smooth': 'spin-smooth 1s linear infinite',
        'slide-up': 'slide-up 0.25s ease-out both',
        'fade-in': 'fade-in 0.2s ease-out both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
      },
      keyframes: {
        'pulse-glow-red': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.2)' },
          '50%': { boxShadow: '0 0 12px 3px rgba(239,68,68,0.2)' },
        },
        'spin-smooth': { to: { transform: 'rotate(360deg)' } },
        'slide-up': {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
