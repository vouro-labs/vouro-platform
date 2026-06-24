/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vouro: {
          bg: '#000000',
          surface: '#0D0D0D',
          ground: '#262626',
          lime: '#FFFFFF',
          cyan: '#E5E5E5',
          gold: '#D4D4D4',
          blue: '#A3A3A3',
          orange: '#737373',
          red: '#525252',
          text: '#FFFFFF',
          muted: '#A3A3A3',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)",
      }
    },
  },
  plugins: [],
}
