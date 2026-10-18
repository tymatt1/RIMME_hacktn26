import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// In development, requests to /api are proxied to the backend so the browser stays same-origin
// (no CORS, no mixed-content problems). Set API_PROXY_TARGET in .env.local to point elsewhere.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const target = env.API_PROXY_TARGET || 'http://147.224.195.130:8000'
  return {
    base: './',
    plugins: [react()],
    optimizeDeps: { include: ['pdfmake/build/pdfmake.js', 'pdfmake/build/vfs_fonts.js'] },
    server: { proxy: { '/api': { target, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') } } },
    preview: { proxy: { '/api': { target, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, '') } } },
  }
})
