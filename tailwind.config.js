export default {
  darkMode: 'class',
  content: [
    './components/**/*.{js,ts,vue}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.ts',
    './app.vue',
  ],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'herb': {
          green: '#A8D5BA',
          'green-light': '#C8E6D4',
          'green-dark': '#7BBF96',
          purple: '#C5B3D8',
          'purple-light': '#DDD1E8',
          'purple-dark': '#A98DC5',
          cream: '#F5F0E8',
          'cream-dark': '#EDE5D8',
          brown: '#6B5B4E',
          'brown-light': '#D4C5B2',
          pink: '#E8C4C4',
        },
      },
      fontFamily: {
        'handwrite': ['"Ma Shan Zheng"', 'cursive'],
        'display': ['"ZCOOL XiaoWei"', 'serif'],
        'serif': ['"Noto Serif SC"', 'serif'],
      },
      animation: {
        'watercolor-spread': 'watercolor-spread 0.6s ease-out forwards',
        'press-mold': 'press-mold 0.4s ease-in-out forwards',
        'handwrite': 'handwrite 0.8s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'watercolor-spread': {
          '0%': { transform: 'scale(0.3)', opacity: '0', filter: 'blur(8px)' },
          '60%': { transform: 'scale(1.05)', opacity: '0.9', filter: 'blur(2px)' },
          '100%': { transform: 'scale(1)', opacity: '1', filter: 'blur(0)' },
        },
        'press-mold': {
          '0%': { transform: 'scale(1.02)', filter: 'brightness(1.1)' },
          '50%': { transform: 'scale(0.98)', filter: 'brightness(0.95)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        'handwrite': {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}
