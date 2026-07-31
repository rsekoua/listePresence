import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Cible du backend Django (proxy /api et /media). Surchargée via la variable
// d'environnement VITE_API_TARGET (ex. si le 8000 est occupé par un autre projet).
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Déploiement mono-origine (cf. backend/config/settings.py — FRONTEND_DIST) :
    // le build atterrit directement là où Django/WhiteNoise le sert, sans copie manuelle.
    outDir: '../backend/frontend_dist',
    emptyOutDir: true,
  },
  server: {
    // host: true → écoute sur 0.0.0.0, accessible depuis le réseau local (téléphone)
    host: true,
    port: 5174,
    proxy: {
      // Toutes les requêtes /api sont redirigées vers le backend Django
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      // Photos CNI servies par le backend en développement
      '/media': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
