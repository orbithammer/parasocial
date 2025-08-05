// frontend/postcss.config.mjs
// Version: 1.2.0
// Fixed: Import and use @tailwindcss/postcss as a function for Tailwind CSS v4

import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [
    tailwindcss,
    autoprefixer,
  ],
}

export default config

// frontend/postcss.config.mjs