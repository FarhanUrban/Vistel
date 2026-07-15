import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    // Same-origin stylesheets should not use crossorigin — browsers send Origin,
    // and a poisoned Cloudflare cache variant was serving index.html as text/html.
    {
      name: 'strip-stylesheet-crossorigin',
      transformIndexHtml(html) {
        return html.replace(
          /<link rel="stylesheet" crossorigin href=/g,
          '<link rel="stylesheet" href=',
        )
      },
    },
  ],
  build: {
    // Unique assets folder each release so CDN cannot reuse poisoned MIME cache entries
    // left by SPA HTML fallbacks under /assets or /static.
    assetsDir: 'm8',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
