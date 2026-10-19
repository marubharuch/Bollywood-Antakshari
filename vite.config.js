import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Set BASE_PATH when deploying to GitHub Pages (e.g. /Bollywood-Antakshari/)
const base = process.env.BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      base,
      includeAssets: ['favicon.svg', 'icons.svg'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'Bollywood Antakshari Tournament',
        short_name: 'Antakshari',
        description: 'Admin, projector, and offline tournament tools',
        start_url: base,
        scope: base,
        display: 'standalone',
        background_color: '#0a0612',
        theme_color: '#0a0612',
        icons: [
          {
            src: `${base}favicon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
})
