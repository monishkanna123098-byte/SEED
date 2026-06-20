/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // S.E.E.D. Design System — do not modify without design review
        seed: {
          navy:    '#065A82',
          teal:    '#028090',
          mint:    '#02C39A',
          ice:     '#EAF4F8',
          dark:    '#1A2B3C',
          muted:   '#64748B',
          amber:   '#F4A261',
          alert:   '#E63946',
          white:   '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '12px',
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(6, 90, 130, 0.10), 0 2px 4px -2px rgba(6, 90, 130, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(6, 90, 130, 0.12), 0 4px 6px -4px rgba(6, 90, 130, 0.08)',
      },
      screens: {
        xs: '375px', // Minimum supported width per spec
      },
    },
  },
  plugins: [],
}
