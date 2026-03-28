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
      // Swagger sous /api côté Nest ; utile si tu appelles le doc via le dev server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Socket.IO — même cible que VITE_API_URL pour rester aligné avec le backend
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

