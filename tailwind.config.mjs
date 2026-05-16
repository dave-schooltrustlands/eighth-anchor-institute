import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        // Synthesis_v5: dignified serif headlines, precise sans body, monospace map labels
        serif: ['"Cormorant Garamond"', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Inter', '"DM Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // EAI palette — Synthesis_v5
        'eai-navy': '#0E1A24',       // deep anchor navy
        'eai-green': '#123D2E',      // trust green
        'eai-parchment': '#F4EFE4',  // warm parchment
        'eai-bone': '#FAF8F1',       // bone white
        'eai-gold': '#B88A2E',       // old gold
        'eai-blueprint': '#536879',  // blueprint blue-gray
        'eai-field': '#7A5A3A',      // field-station brown
      },
      backgroundImage: {
        // Faint blueprint grid for grounds-plan backgrounds
        'blueprint-grid': 'repeating-linear-gradient(to right, transparent 0, transparent 31px, rgba(83,104,121,0.10) 31px, rgba(83,104,121,0.10) 32px), repeating-linear-gradient(to bottom, transparent 0, transparent 31px, rgba(83,104,121,0.10) 31px, rgba(83,104,121,0.10) 32px)',
      },
    },
  },
  plugins: [typography],
};
