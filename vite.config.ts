import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/pickleball-pwa/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [],
      },
      manifest: {
        name: 'Pickleball Scorekeeper',
        short_name: 'Pickleball',
        description: 'Offline-first pickleball score tracker with strict game logic',
        theme_color: '#14532d',
        background_color: '#052e16',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/pickleball-pwa/',
        scope: '/pickleball-pwa/',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['sports', 'utilities'],
        lang: 'en-US',
      },
      devOptions: {
        enabled: false,
      }
    })
  ],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  }
})
