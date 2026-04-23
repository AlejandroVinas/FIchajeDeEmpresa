import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy para desarrollo: las peticiones a /api van al backend sin problemas de CORS
    proxy: {
      '/api': {
        target:      'http://localhost:3000',
        changeOrigin: true,
        rewrite:     path => path.replace(/^\/api/, ''),
      },
    },
  },
});
