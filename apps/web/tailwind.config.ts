import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Walletz Med — Prism Flow identity tokens
        brand: {
          // Primary: Cobalt — Trusts Progress
          cobalt:           '#152DFF',
          'cobalt-dark':    '#0f22cc',
          'cobalt-light':   '#3d50ff',
          'cobalt-subtle':  '#eef0ff',
          // Secondary: Teal — People & Support
          teal:             '#00B7A8',
          'teal-dark':      '#009d8f',
          'teal-light':     '#33c9bb',
          'teal-subtle':    '#e6f8f7',
          // Accent: Tangerine — Momentum & Care
          tangerine:        '#FF784F',
          'tangerine-dark': '#e56035',
          'tangerine-subtle': '#fff0eb',
          // Sidebar / shell
          graphite:         '#0f172a',
          'graphite-light': '#1e293b',
          'graphite-mid':   '#334155',
          // Aliases kept for compat with pages that reference them
          emerald:          '#00B7A8',
          'emerald-dark':   '#009d8f',
          'emerald-light':  '#33c9bb',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#F2F6FA',   // Pale Mist
          border:  '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px 0 rgba(21,45,255,0.06), 0 4px 16px 0 rgba(21,45,255,0.06)',
        'card-hover': '0 4px 24px 0 rgba(21,45,255,0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
