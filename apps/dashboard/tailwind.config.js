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
        cyber: {
          bg: '#060913',
          surface: '#0B1120',
          card: '#0D1527',
          sidebar: '#070B16',
          header: '#080D1C',
          border: '#162238',
          'border-light': '#1E3050',
          cyan: '#00E5FF',
          'cyan-glow': '#06B6D4',
          indigo: '#6366F1',
          violet: '#8B5CF6',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          text: '#F8FAFC',
          muted: '#94A3B8',
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-edge': 'flowEdge 1.5s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.45))' },
          '50%': { opacity: '0.65', filter: 'drop-shadow(0 0 3px rgba(0, 229, 255, 0.15))' },
        },
        flowEdge: {
          '0%': { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        }
      }
    },
  },
  plugins: [],
}

