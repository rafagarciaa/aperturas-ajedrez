import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // En GitHub Pages la app vive en /aperturas-ajedrez/ (lo fija el workflow de despliegue).
  base: process.env.BASE_PATH ?? '/',
  // La base de aperturas (~3.900 líneas) va dentro del bundle principal.
  build: { chunkSizeWarningLimit: 1200 },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Aperturas · Entrenador de ajedrez',
        short_name: 'Aperturas',
        description: 'Practica aperturas de ajedrez y sus variantes contra Stockfish',
        lang: 'es',
        theme_color: '#f3eee3',
        background_color: '#f3eee3',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // El motor (.wasm), la base de aperturas y la tipografía (solo alfabeto latino)
        // quedan disponibles sin conexión.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,wasm}', '**/*-latin-opsz-*.woff2'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
    }),
  ],
});
