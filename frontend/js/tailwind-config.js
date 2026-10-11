/* MediCare AI — Tailwind (CDN) theme. Loaded right after the Tailwind CDN script on every page,
   so colours, fonts and radii are defined once instead of per page. */
tailwind.config = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
      },
      colors: {
        ink: '#0F2A37',
        muted: '#4F6574',
        faint: '#647887',
        mist: '#F4F7F8',
        line: '#D9E2E6',
        brand: {
          50: '#E8F3F3', 100: '#D0E7E8', 200: '#A5CFD2', 500: '#1A8C93',
          600: '#0F7A82', 700: '#0B6168', 800: '#0A4C52',
        },
      },
      borderRadius: { control: '8px', panel: '12px', sheet: '16px' },
    },
  },
};
