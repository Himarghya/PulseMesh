/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pm: {
          bg: '#070A12',
          surface: '#0F1420',
          elevated: '#151C2B',
          overlay: '#1B2436',
          border: '#202A3A',
          'border-subtle': '#18202E',
          'border-focus': '#38BDF8',
          text: '#F4F7FB',
          'text-secondary': '#98A4B7',
          'text-muted': '#667085',
          cyan: '#00E5FF',
          'cyan-muted': '#06B6D4',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
        },
        cyber: {
          bg: '#070A12',
          surface: '#0F1420',
          card: '#121827',
          sidebar: '#0A0E17',
          header: '#0B101D',
          border: '#202A3A',
          'border-light': '#283448',
          cyan: '#00E5FF',
          'cyan-glow': '#06B6D4',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          text: '#F4F7FB',
          muted: '#98A4B7',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'pulse-subtle': 'pulseSubtle 2.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
