/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background palette  (Binance dark)
        'bg-primary':      '#0b0e11',
        'bg-secondary':    '#181a20',
        'bg-surface':      '#1e2329',
        'bg-hover':        '#2b3139',
        // Border palette
        'border-base':     '#2b3139',
        'border-focus':    '#474d57',
        // Text palette
        'text-primary':    '#eaecef',
        'text-muted':      '#848e9c',
        'text-dim':        '#5e6673',
        // Accent — per page
        'accent-firewall': '#f6465d',
        'accent-deploy':   '#0ecb81',
        'accent-database': '#f0b90b',
        'accent-cf':       '#f6821f',
        // Status
        success:           '#0ecb81',
        warning:           '#f0b90b',
        error:             '#f6465d',
        info:              '#1e9cf4',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '16px' }],
        'sm':   ['12px', { lineHeight: '18px' }],
        'base': ['14px', { lineHeight: '20px' }],
        'md':   ['15px', { lineHeight: '22px' }],
        'lg':   ['18px', { lineHeight: '26px' }],
        'xl':   ['20px', { lineHeight: '28px' }],
        '2xl':  ['24px', { lineHeight: '32px' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        'lg':    '8px',
        'xl':    '12px',
        '2xl':   '16px',
      },
      boxShadow: {
        'surface': '0 2px 8px rgba(0,0,0,0.4)',
        'lg':      '0 4px 16px rgba(0,0,0,0.5)',
        'glow-green':  '0 0 8px rgba(14,203,129,0.3)',
        'glow-gold':   '0 0 8px rgba(240,185,11,0.3)',
        'glow-red':    '0 0 8px rgba(246,70,93,0.3)',
        'glow-cf':     '0 0 8px rgba(246,130,31,0.3)',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in':     'slideIn 0.2s ease-out',
        'pulse-soft':   'pulseSoft 2s ease-in-out infinite',
        'spin-slow':    'spin 3s linear infinite',
        'shimmer':      'shimmer 1.5s infinite',
        'entrance':     'entrance 0.3s ease-out',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 }, to: { opacity: 1 } },
        slideIn:   { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        entrance:  { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
