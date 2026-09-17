import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            // Silently absorb proxy disconnects / client resets on SSE
            if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.code === 'ECONNREFUSED') {
              return;
            }
            console.warn('[Vite Proxy]', err.message);
          });
        },
      },
      '/metrics': 'http://localhost:3000',
      '/healthz': 'http://localhost:3000',
    },
  },
});
