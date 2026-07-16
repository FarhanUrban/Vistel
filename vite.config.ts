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
      name: 'strip-asset-crossorigin',
      transformIndexHtml(html) {
        const stripped = html
          .replace(/<link rel="stylesheet" crossorigin href=/g, '<link rel="stylesheet" href=')
          .replace(/<script type="module" crossorigin src=/g, '<script type="module" src=')
        return stripped.replace(
          '</head>',
          `    <style>#boot-fallback{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#f7feff;color:#272727;font-family:Inter,sans-serif;padding:1.5rem;text-align:center}#boot-fallback button{margin-top:1rem;padding:.6rem 1rem;border-radius:8px;border:0;background:#272727;color:#f7feff;font-weight:600;cursor:pointer}</style>
  </head>`,
        ).replace(
          '<div id="app"></div>',
          `<div id="app"></div>
    <div id="boot-fallback" hidden>
      <div>
        <p><strong>Vislet could not start.</strong></p>
        <p style="margin-top:.5rem;font-size:.9rem;opacity:.75">Try a hard refresh. If this persists after an update, clear site data for vislet.org.</p>
        <button type="button" onclick="sessionStorage.removeItem('vislet_chunk_reload_v2');location.replace(location.pathname)">Reload Vislet</button>
      </div>
    </div>
    <script>
      window.__visletMarkBooted=function(){var f=document.getElementById('boot-fallback');if(f)f.hidden=true;if(window.__visletBootTimer)clearTimeout(window.__visletBootTimer)};
      window.__visletBootTimer=setTimeout(function(){var a=document.getElementById('app');if(a&&!a.innerHTML.trim()){var f=document.getElementById('boot-fallback');if(f)f.hidden=false}},15000);
      window.addEventListener('error',function(e){if(e.target&&e.target.tagName==='SCRIPT'&&String(e.target.src||'').indexOf('/m11/')!==-1){var f=document.getElementById('boot-fallback');if(f)f.hidden=false}},true);
    </script>`,
        )
      },
    },
  ],
  build: {
    // Unique assets folder so CDN cannot reuse poisoned MIME/cache entries.
    assetsDir: 'm11',
    // Route CSS chunks were being CDN-cached as HTML mid-deploy on vislet.org
    // (then vite preloadError caused blank-page refresh loops). One CSS file only.
    cssCodeSplit: false,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
