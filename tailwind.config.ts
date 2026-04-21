import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        condensed: ['var(--font-condensed)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: 'oklch(9% 0.010 280)',
        'ink-70': 'oklch(35% 0.010 280)',
        'ink-40': 'oklch(62% 0.010 280)',
        'ink-15': 'oklch(85% 0.008 280)',
        'ink-06': 'oklch(94% 0.005 280)',
        paper: 'oklch(98% 0.004 90)',
        'accent-spring': 'oklch(64% 0.160 22)',
        'accent-summer': 'oklch(56% 0.160 248)',
        'accent-fall': 'oklch(62% 0.155 48)',
        'accent-winter': 'oklch(42% 0.120 168)',
      },
      spacing: {
        'xs': '6px',
        'sm': '12px',
        'md': '24px',
        'lg': '48px',
        'xl': '80px',
        '2xl': '140px',
      },
      borderRadius: {
        DEFAULT: '0px',
      },
    },
  },
  plugins: [],
}

export default config
