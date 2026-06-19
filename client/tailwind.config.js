/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        display: ['Amiri', 'Georgia', 'serif'],
        kufi: ['"Reem Kufi"', '"Hanken Grotesk"', 'sans-serif'],
        arabic: ['"Scheherazade New"', 'Amiri', 'serif'],
      },
      colors: {
        // Neutral hangat bernuansa hijau-perkamen (menggantikan "stone").
        // 50 = perkamen terang  →  950 = hijau-malam pekat.
        stone: {
          50: '#f6efe0',
          100: '#efe5d2',
          200: '#e2d4b8',
          300: '#cdbb95',
          400: '#a39572',
          500: '#7c7459',
          600: '#5b5a44',
          700: '#3c4636',
          800: '#243029',
          900: '#13231d',
          950: '#0a1814',
        },
        // Hijau zamrud (aksen/primer).
        emerald: {
          50: '#e9f3ec',
          100: '#cce5d4',
          200: '#9fceaf',
          300: '#67b187',
          400: '#329468',
          500: '#1b7c52',
          600: '#136442',
          700: '#0f4f36',
          800: '#0e3f2d',
          900: '#0b3023',
          950: '#06231b',
        },
        // Emas iluminasi (aksen utama).
        gold: {
          50: '#fbf5e3',
          100: '#f4e7be',
          200: '#ecd28a',
          300: '#e3c06a',
          400: '#d4a83f',
          500: '#bd8f2c',
          600: '#a07628',
          700: '#7c5b24',
          800: '#5d4420',
          900: '#3f2f18',
          DEFAULT: '#bd8f2c',
        },
        // "Merugi" — kuning kuningan.
        amber: {
          50: '#faf0d8',
          100: '#f3dca6',
          300: '#e0b452',
          500: '#c08a2e',
          600: '#a06f22',
          700: '#7d531c',
          800: '#5d3f18',
          950: '#2c1d0c',
        },
        // "Celaka" — terakota.
        red: {
          50: '#f8e8e2',
          100: '#efcabb',
          300: '#d68a6f',
          500: '#b04a2c',
          600: '#963a21',
          700: '#762d1a',
          800: '#562016',
          950: '#2a110c',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,24,20,0.06), 0 8px 24px -12px rgba(10,24,20,0.18)',
        gold: '0 0 0 1px rgba(189,143,44,0.25), 0 14px 40px -20px rgba(189,143,44,0.45)',
      },
    },
  },
  plugins: [],
};
