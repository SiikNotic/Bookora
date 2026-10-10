/** @type {import('tailwindcss').Config} */
// Los colores salen de variables CSS (src/index.css) para poder cambiar
// el acento de plateado a dorado (u otro) en un solo lugar.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        surface2: v('surface-2'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        accent: v('accent'),
        'accent-ink': v('accent-ink'),
        ok: v('ok'),
        warn: v('warn'),
        bad: v('bad'),
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        brand: ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
      },
      borderRadius: { xl2: '1.125rem' },
    },
  },
  plugins: [],
};
