import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Prefer .ts over .js when both exist (e.g. services/api.ts vs api.js).
    extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
  },
  preview: {
    allowedHosts: ['quemjogafc.up.railway.app'],
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ['quemjogafc.up.railway.app'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})
