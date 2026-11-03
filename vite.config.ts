import preact from '@preact/preset-vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.BASE_URL ?? '/',
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'presets/*.json'],
      manifest: {
        name: 'MeshCore-Client von CarinthiaMesh', short_name: 'CarinthiaMesh', lang: 'de',
        description: 'Browserbasierter MeshCore-Client (Web Bluetooth)', theme_color: '#0b3d5c', background_color: '#0b3d5c',
        display: 'standalone', start_url: '.', scope: '.',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'], navigateFallback: 'index.html' },
    }),
  ],
  test: { environment: 'jsdom', include: ['tests/**/*.test.{ts,tsx}'] },
})
