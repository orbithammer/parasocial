// frontend/postcss.config.mjs
// Version: 1.4.0
// Fixed: Import @tailwindcss/postcss as function and invoke it
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: [
    tailwindcss(),
    autoprefixer,
  ],
}
export default config
// frontend/postcss.config.mjs
