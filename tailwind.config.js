/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#272727',
        black: '#000000',
        'accent-orange': '#FFBC1F',
        'accent-blue': '#86A5D9',
      },
      fontFamily: {
        display: ['Lexend Mega', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
    },
  },
  plugins: [],
}
