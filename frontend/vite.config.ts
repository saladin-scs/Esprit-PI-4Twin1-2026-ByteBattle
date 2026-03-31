import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // API REST via préfixe dédié (évite conflit avec la route SPA /challenges, etc.)
      // 127.0.0.1 évite sur Windows les soucis où `localhost` résout en IPv6 (::1) sans listener
      '/bb-api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bb-api/, ''),
      },
      // Swagger sous /api côté Nest ; utile si tu appelles le doc via le dev server
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // Socket.IO — même cible que le backend
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

