import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy common backend routes to avoid CORS during dev
    proxy: {
      // AI endpoints
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Auth and user routes
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/register': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/user': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // Other backend helpers
      '/smooth_stroke': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
