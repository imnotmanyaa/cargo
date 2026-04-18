import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 30', 'android >= 4.4', 'safari >= 7', 'edge >= 12'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
      polyfills: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'CargoTrans',
        short_name: 'CargoTrans',
        description: 'Система управления грузами | Астана — Қарағанды — Алматы',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#3b82f6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: 'Сканер',
            short_name: 'Сканер',
            url: '/scanner',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache all API responses for 1 hour for offline fallback
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /\.(js|css|woff2?|png|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 86400 * 7 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/socket.io': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  }
});
