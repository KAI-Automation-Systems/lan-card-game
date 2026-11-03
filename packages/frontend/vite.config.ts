import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Skyjo',
        short_name: 'Skyjo',
        description: 'Lokale multiplayer Skyjo voor op het wifi-netwerk',
        theme_color: '#0f0c29',
        background_color: '#0f0c29',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
        ],
      },
      workbox: {
        // Cache de frontend assets voor offline gebruik na de eerste load.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        // Laat socket.io verkeer met rust (nooit via de SPA-fallback of cache).
        navigateFallbackDenylist: [/^\/socket\.io/],
        // Geen runtime caching: socket.io verkeer mag nooit gecached worden.
        runtimeCaching: [],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Tijdens dev: stuur socket.io verkeer door naar de backend.
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
