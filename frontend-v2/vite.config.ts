import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // host: true → écoute sur 0.0.0.0, accessible depuis le réseau local (téléphone)
    host: true,
    port: 5174,
    proxy: {
      // Toutes les requêtes /api sont redirigées vers le backend Django
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // Photos CNI servies par le backend en développement
      '/media': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
