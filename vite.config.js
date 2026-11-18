import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const API_TARGET =
  'https://kutsaga-app.livelybush-d14e9c76.switzerlandnorth.azurecontainerapps.io'

const proxy = {
  target: API_TARGET,
  changeOrigin: true,
  secure: true,
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': proxy,
      '/health': proxy,
    },
  },
  preview: {
    port: 3000,
    host: true,
    proxy: {
      '/api': proxy,
      '/health': proxy,
    },
  },
})
