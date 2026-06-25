import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
