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
      // REST API through dedicated prefix (avoids conflicts with SPA route /challenges, etc.)
      // 127.0.0.1 avoids Windows cases where `localhost` resolves to IPv6 (::1) without a listener
      '/bb-api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bb-api/, ''),
      },
      // Swagger under /api on Nest side; useful when calling docs through dev server
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
      // Socket.IO - same target as backend
      '/socket.io': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});

