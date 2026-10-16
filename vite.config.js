import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite'; 

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'inline',
      workbox: {
        // Automatically caches all HTML, JS, CSS, and asset files found in your dist folder
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'MattBees Water App',
        short_name: 'MattBees Water',
        description: 'Offline-ready company water operations application',
        background_color: '#0B3B45',
        theme_color: '#0B3B45',
        icons: [
          { src: 'mattbees-water-app.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })
  ]
});
