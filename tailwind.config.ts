import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#131313',
          dim: '#131313',
          bright: '#3a3939',
          variant: '#353534',
          tint: '#4edadc',
          container: {
            DEFAULT: '#201f1f',
            low: '#1c1b1b',
            lowest: '#0e0e0e',
            high: '#2a2a2a',
            highest: '#353534',
          },
        },
        primary: {
          DEFAULT: '#55dfe2',
          container: '#2cc3c6',
          'fixed-dim': '#4edadc',
          fixed: '#70f6f9',
        },
        'on-surface': {
          DEFAULT: '#e5e2e1',
          variant: '#bbc9c9',
        },
        'on-primary': {
          DEFAULT: '#003738',
          container: '#004c4d',
          'fixed-variant': '#004f51',
          fixed: '#002020',
        },
        'on-surface-variant': '#bbc9c9',
        'on-primary-container': '#004c4d',
        'on-secondary-container': '#cca8ff',
        outline: {
          DEFAULT: '#869393',
          variant: '#3c4949',
        },
        secondary: {
          DEFAULT: '#d7baff',
          container: '#5f29a3',
          'fixed-dim': '#d7baff',
          fixed: '#eddcff',
        },
        'on-secondary': {
          DEFAULT: '#440087',
          fixed: '#290055',
          'fixed-variant': '#5c26a1',
        },
        error: {
          DEFAULT: '#ffb4ab',
          container: '#93000a',
        },
        'on-error': {
          DEFAULT: '#690005',
          container: '#ffdad6',
        },
        inverse: {
          surface: '#e5e2e1',
          'on-surface': '#313030',
          primary: '#00696b',
        },
        tertiary: {
          DEFAULT: '#cccccc',
          container: '#b0b1b1',
          'fixed-dim': '#c6c6c7',
          fixed: '#e2e2e2',
        },
        'on-tertiary': {
          DEFAULT: '#2f3131',
          container: '#424444',
          'fixed-variant': '#454747',
          fixed: '#1a1c1c',
        },
        background: '#131313',
        'on-background': '#e5e2e1',
      },
      fontFamily: {
        body: ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        'body-lg': ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        'body-sm': ['"Be Vietnam Pro"', 'system-ui', '-apple-system', 'sans-serif'],
        headline: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        'headline-md': ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        clock: ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        'display-clock': ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        'display-clock-mobile': ['Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        'label-caps': ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display-clock': ['80px', { lineHeight: '96px', letterSpacing: '-0.02em', fontWeight: '300' }],
        'display-clock-mobile': ['56px', { lineHeight: '64px', fontWeight: '300' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'headline-md': ['24px', { lineHeight: '32px', fontWeight: '500' }],
        'label-caps': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
      },
      borderRadius: {
        squircle: '1.25rem',
      },
      spacing: {
        sidebar: '80px',
      },
    },
  },
  plugins: [],
}
export default config
