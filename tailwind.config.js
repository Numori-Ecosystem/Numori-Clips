/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue"
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutral scale derived from the app's dark palette.
        // Dark mode uses the lower end; light mode uses the upper end.
        gray: {
          50:  '#FCFCFA',  // foreground
          100: '#F5F4F2',
          200: '#E8E6E3',
          300: '#C1C0C0',  // dimmed 1
          400: '#939293',  // dimmed 2
          500: '#727072',  // dimmed 3
          600: '#5B595C',  // dimmed 4
          700: '#403E41',  // dimmed 5
          800: '#2D2A2E',  // background (used as elevated surface in dark)
          850: '#272428',  // between bg and bg-dimmed-1
          900: '#221F22',  // bg dimmed 1
          925: '#2D2A2E',  // main dark bg (same as 800 — the primary surface)
          950: '#19181A',  // bg dimmed 2 (deepest)
        },
        // Primary accent — the pink/rose from the palette (keyword color)
        // extended into a full scale for interactive elements.
        primary: {
          50:  '#FFF0F3',
          100: '#FFD9E1',
          200: '#FFB3C4',
          300: '#FF8DA8',
          400: '#FF6188',  // keyword color — the hero accent
          500: '#E8456E',
          600: '#CC2D56',
          700: '#A61E42',
          800: '#801530',
          900: '#5C0E22',
          950: '#3A0715',
        },
        success: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#A9DC76',  // function color
          400: '#86C95A',
          500: '#6BB33E',
          600: '#539A2A',
          700: '#3D7A1C',
          800: '#2D5E14',
          900: '#1F420E',
          950: '#122808',
        },
        warning: {
          50:  '#FFFBEB',
          100: '#FFF3C4',
          200: '#FFE68A',
          300: '#FFD866',  // string color
          400: '#FCC73E',
          500: '#F0B429',
          600: '#D99A06',
          700: '#B47D04',
          800: '#8C6103',
          900: '#664702',
          950: '#402D01',
        },
        error: {
          50:  '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
          950: '#450A0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'modal': '0 20px 60px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
