/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:    '#4F46E5',
        'primary-50':  '#EEF2FF',
        'primary-100': '#E0E7FF',
        'primary-200': '#C7D2FE',
        'primary-600': '#4338CA',
        'primary-700': '#3730A3',
        success:    '#16A34A',
        'success-50':  '#F0FDF4',
        'success-100': '#DCFCE7',
        'success-700': '#15803D',
        warning:    '#D97706',
        'warning-50':  '#FFFBEB',
        'warning-100': '#FEF3C7',
        'warning-700': '#B45309',
        danger:     '#DC2626',
        'danger-50':   '#FEF2F2',
        'danger-100':  '#FEE2E2',
        'danger-700':  '#B91C1C',
        ink:        '#0F172A',
        'ink-soft': '#475569',
        'ink-mute': '#94A3B8',
        surface:    '#FFFFFF',
        bg:         '#F5F7FB',
        border:     '#E2E8F0',
        'border-soft': '#EEF1F6',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        sora:  ['Sora', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '10px',
        lg: '20px',
        xl: '24px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15,23,42,.04), 0 1px 1px rgba(15,23,42,.03)',
        md: '0 4px 16px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)',
        lg: '0 20px 48px rgba(15,23,42,.14), 0 4px 12px rgba(15,23,42,.06)',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        pop: {
          from: { opacity: '0', transform: 'scale(.97) translateY(6px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        ring: {
          '0%':   { transform: 'scale(.5)', opacity: '1' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
      },
      animation: {
        slideIn: 'slideIn .25s ease',
        pop:     'pop .18s ease',
        ring:    'ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};
