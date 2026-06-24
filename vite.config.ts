/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync } from 'node:fs'

// Base path for GitHub Pages project site (vlad-168/domino -> /domino/)
const BASE = process.env.VITE_BASE ?? '/domino/'

// Copy index.html -> 404.html so GitHub Pages serves the SPA on deep links.
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      try {
        copyFileSync('dist/index.html', 'dist/404.html')
      } catch {
        /* noop */
      }
    },
  }
}

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Domino — дела в паре',
        short_name: 'Domino',
        description: 'Семейное PWA для геймификации бытовых дел в паре',
        theme_color: '#6C5CE7',
        background_color: '#0f0d1a',
        display: 'standalone',
        orientation: 'portrait',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true
      },
      devOptions: { enabled: false }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true
  }
})
