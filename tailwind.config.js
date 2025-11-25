module.exports = {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        'duckdb-yellow': '#FFF000',
        'duckdb-dark': '#1A1A1A'
      }
    }
  },
  plugins: [],
  darkMode: 'class'
};
