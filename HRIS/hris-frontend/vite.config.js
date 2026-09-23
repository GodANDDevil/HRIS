import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const djangoProxy = {
  target: 'http://127.0.0.1:8000',
  changeOrigin: true,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': djangoProxy,
    },
  },
  preview: {
    proxy: {
      '/api': djangoProxy,
    },
  },
})
