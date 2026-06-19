import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Saat dev lokal, proxy /api ke Express (port 3001).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
