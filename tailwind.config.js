/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#030303',
          secondary: '#0a0a0a',
        },
        text: {
          primary: '#ffffff',
          secondary: '#a0a0a0',
          muted: '#555555',
        },
        accent: '#ffffff',
        border: 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      spacing: {
        1: '0.25rem',
        2: '0.5rem',
        3: '1rem',
        4: '1.5rem',
        6: '2rem',
        8: '3rem',
        12: '5rem',
        16: '8rem',
        24: '12rem',
        32: '16rem',
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },
      transitionTimingFunction: {
        fast: 'cubic-bezier(0.16, 1, 0.3, 1)',
        normal: 'cubic-bezier(0.16, 1, 0.3, 1)',
        slow: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '180ms',
        normal: '420ms',
        slow: '850ms',
      },
      screens: {
        'xs': '375px',
        'sm': '480px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1600px',
        '3xl': '1920px',
      },
      keyframes: {
        orbFloat: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(1px, -2px)' },
          '50%': { transform: 'translate(-2px, 1px)' },
          '75%': { transform: 'translate(-1px, -1px)' },
        },
        orbPulse: {
          '0%, 100%': { opacity: '0.6', boxShadow: '0 0 8px rgba(74, 144, 226, 0.4)' },
          '50%': { opacity: '1', boxShadow: '0 0 12px rgba(74, 144, 226, 0.8), 0 0 20px rgba(74, 144, 226, 0.3)' },
        },
        pulseGreen: {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
        },
        rolePulse: {
          '0%, 100%': { boxShadow: '0 0 6px rgba(99, 102, 241, 0.5)' },
          '50%': { boxShadow: '0 0 14px rgba(99, 102, 241, 0.9), 0 0 24px rgba(99, 102, 241, 0.3)' },
        },
        mouseScrollDot: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '45%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '0' },
        },
        visualGlow: {
          '0%': { opacity: '0.4' },
          '100%': { opacity: '1' },
        },
        visualParticles: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '32px -64px' },
        },
        pulseDot: {
          '0%': { opacity: '0.5', boxShadow: '0 0 4px #38bdf8' },
          '100%': { opacity: '1', boxShadow: '0 0 12px #38bdf8' },
        },
        ftRidgeDraw: {
          '0%': { strokeDashoffset: '3200', opacity: '0' },
          '15%': { opacity: '1' },
          '78%': { strokeDashoffset: '0', opacity: '1' },
          '100%': { strokeDashoffset: '0', opacity: '0' },
        },
        ftBreathe: {
          '0%': { opacity: '0.7' },
          '100%': { opacity: '1' },
        },
        ftGlowPulse: {
          '0%': { transform: 'scale(1)', opacity: '0.7' },
          '100%': { transform: 'scale(1.06)', opacity: '1' },
        },
        nodePulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(99,102,241,0.5)' },
          '50%': { boxShadow: '0 0 16px rgba(99,102,241,0.9), 0 0 28px rgba(99,102,241,0.3)' },
        }
      },
      animation: {
        'orb-float': 'orbFloat 8s ease-in-out infinite, orbPulse 3.5s ease-in-out infinite',
        'pulse-green': 'pulseGreen 2s infinite',
        'role-pulse': 'rolePulse 2.4s ease-in-out infinite',
        'mouse-scroll-dot': 'mouseScrollDot 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite',
        'visual-glow': 'visualGlow 8s ease-in-out infinite alternate',
        'visual-particles': 'visualParticles 25s linear infinite',
        'pulse-dot': 'pulseDot 2s infinite alternate',
        'ft-ridge-draw': 'ftRidgeDraw 9s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        'ft-breathe': 'ftBreathe 10s ease-in-out infinite alternate',
        'ft-glow-pulse': 'ftGlowPulse 14s ease-in-out infinite alternate',
        'node-pulse': 'nodePulse 2.6s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
