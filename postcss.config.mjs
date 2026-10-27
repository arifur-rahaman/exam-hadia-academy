// Tailwind runs as a plain PostCSS plugin so both webpack (production build) and Turbopack (dev) can use it.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
