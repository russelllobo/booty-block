/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        blush: '#FFF1F6',
        petal: '#FFD6E7',
        bubble: '#FF8FBE',
        raspberry: '#E91E73',
        cherry: '#AF1555',
        cocoa: '#3A1F2C',
        mink: '#7D5A67',
        cream: '#FFF9F3',
        mint: '#BFF7D3',
        lime: '#89F38C',
      },
      borderRadius: {
        soft: '28px',
      },
    },
  },
  plugins: [],
};
